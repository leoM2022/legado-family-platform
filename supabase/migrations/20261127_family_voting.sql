
BEGIN;

-- ==========================================
-- 1. FECHAS DE VOTACIÓN
-- ==========================================

ALTER TABLE public.family_award_editions
ADD COLUMN voting_starts_at TIMESTAMPTZ,
ADD COLUMN voting_ends_at TIMESTAMPTZ;

ALTER TABLE public.family_award_editions
ADD CONSTRAINT family_awards_valid_voting_window
CHECK (
    (
        voting_starts_at IS NULL
        AND voting_ends_at IS NULL
    )
    OR (
        voting_starts_at IS NOT NULL
        AND voting_ends_at IS NOT NULL
        AND voting_starts_at < voting_ends_at
    )
);

-- ==========================================
-- 2. TABLA PRIVADA DE VOTOS
-- ==========================================

-- Permite verificar también mediante clave
-- foránea que el nominado pertenezca a la terna.
ALTER TABLE public.family_award_nominees
ADD CONSTRAINT family_nominee_id_category_unique
UNIQUE (id, category_id);

CREATE TABLE public.family_award_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category_id UUID NOT NULL
        REFERENCES public.family_award_categories(id)
        ON DELETE RESTRICT,

    nominee_id UUID NOT NULL,

    voter_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT one_vote_per_family_category
        UNIQUE (category_id, voter_id),

    CONSTRAINT vote_nominee_belongs_to_category
        FOREIGN KEY (nominee_id, category_id)
        REFERENCES public.family_award_nominees(
            id, category_id
        )
        ON DELETE RESTRICT
);

CREATE INDEX family_award_votes_nominee_idx
ON public.family_award_votes (nominee_id);

ALTER TABLE public.family_award_votes
ENABLE ROW LEVEL SECURITY;

-- Los votos no pueden leerse ni modificarse
-- directamente desde Supabase JS.
REVOKE ALL ON public.family_award_votes
FROM PUBLIC, anon, authenticated;


-- ==========================================
-- 3. CONFIGURAR FECHAS
-- Solo administradores y ediciones borrador.
-- ==========================================

CREATE FUNCTION public.admin_family_awards_set_voting_dates(
    p_edition_id UUID,
    p_starts_at TIMESTAMPTZ,
    p_ends_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM public.family_awards_assert_admin();

    IF p_starts_at IS NULL
       OR p_ends_at IS NULL
       OR p_starts_at >= p_ends_at
       OR p_ends_at <= clock_timestamp()
    THEN
        RAISE EXCEPTION
            'Fechas inválidas: el cierre debe ser futuro';
    END IF;

    UPDATE public.family_award_editions
    SET
        voting_starts_at = p_starts_at,
        voting_ends_at = p_ends_at
    WHERE id = p_edition_id
      AND status = 'draft';

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'La edición no existe o no es borrador';
    END IF;
END;
$$;


-- ==========================================
-- 4. HABILITAR LA VOTACIÓN
-- Cada terna debe tener 2 nominados o más.
-- ==========================================

CREATE FUNCTION public.admin_family_awards_open_voting(
    p_edition_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_edition public.family_award_editions%ROWTYPE;
BEGIN
    PERFORM public.family_awards_assert_admin();

    SELECT *
    INTO v_edition
    FROM public.family_award_editions
    WHERE id = p_edition_id
    FOR UPDATE;

    IF NOT FOUND OR v_edition.status <> 'draft' THEN
        RAISE EXCEPTION
            'La edición no está disponible como borrador';
    END IF;

    IF v_edition.voting_starts_at IS NULL
       OR v_edition.voting_ends_at IS NULL
       OR v_edition.voting_ends_at <= clock_timestamp()
    THEN
        RAISE EXCEPTION
            'Configurá fechas válidas antes de abrir';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.family_award_categories c
        WHERE c.edition_id = p_edition_id
    ) THEN
        RAISE EXCEPTION
            'La edición debe tener categorías';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.family_award_categories c
        WHERE c.edition_id = p_edition_id
          AND (
              SELECT count(*)
              FROM public.family_award_nominees n
              WHERE n.category_id = c.id
          ) < 2
    ) THEN
        RAISE EXCEPTION
            'Cada terna necesita al menos dos nominados';
    END IF;

    UPDATE public.family_award_editions
    SET status = 'voting'
    WHERE id = p_edition_id;
END;
$$;


-- ==========================================
-- 5. CERRAR UNA VOTACIÓN
-- Puede cerrarse antes de la fecha prevista.
-- ==========================================

CREATE FUNCTION public.admin_family_awards_close_voting(
    p_edition_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM public.family_awards_assert_admin();

    UPDATE public.family_award_editions
    SET status = 'closed'
    WHERE id = p_edition_id
      AND status = 'voting';

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'La edición no tiene una votación abierta';
    END IF;
END;
$$;


-- ==========================================
-- 6. EMITIR UN VOTO
-- Un usuario aprobado, un voto por categoría.
-- ==========================================

CREATE FUNCTION public.family_awards_cast_vote(
    p_category_id UUID,
    p_nominee_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := (SELECT auth.uid());
    v_edition public.family_award_editions%ROWTYPE;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = v_user_id
          AND p.approval_status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Cuenta no autorizada'
            USING ERRCODE = '42501';
    END IF;

    -- Bloquear cambios simultáneos de estado
    -- mientras se registra el voto.
    SELECT e.*
    INTO v_edition
    FROM public.family_award_categories c
    JOIN public.family_award_editions e
      ON e.id = c.edition_id
    WHERE c.id = p_category_id
    FOR SHARE OF e;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Terna inexistente';
    END IF;

    IF v_edition.status <> 'voting'
       OR v_edition.voting_starts_at IS NULL
       OR v_edition.voting_ends_at IS NULL
       OR clock_timestamp() < v_edition.voting_starts_at
       OR clock_timestamp() >= v_edition.voting_ends_at
    THEN
        RAISE EXCEPTION 'Votación fuera del plazo permitido';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.family_award_nominees n
        WHERE n.id = p_nominee_id
          AND n.category_id = p_category_id
    ) THEN
        RAISE EXCEPTION
            'El nominado no pertenece a esta terna';
    END IF;

    INSERT INTO public.family_award_votes (
        category_id,
        nominee_id,
        voter_id
    )
    VALUES (
        p_category_id,
        p_nominee_id,
        v_user_id
    )
    ON CONFLICT (category_id, voter_id)
    DO NOTHING;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Ya registraste tu voto en esta categoría';
    END IF;
END;
$$;


-- ==========================================
-- 7. CONSULTAR TERNAS PARA VOTAR
-- No devuelve resultados ni votos ajenos.
-- ==========================================

CREATE FUNCTION public.family_awards_voting_catalog()
RETURNS TABLE (
    edition_id UUID,
    edition_year INTEGER,
    edition_title TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    category_id UUID,
    category_title TEXT,
    category_description TEXT,
    nominee_id UUID,
    nominee_title TEXT,
    nominee_description TEXT,
    nominee_symbol TEXT,
    my_vote_nominee_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.approval_status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Acceso no autorizado'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        e.id,
        e.year,
        e.title,
        e.voting_starts_at,
        e.voting_ends_at,

        c.id,
        c.title,
        c.description,

        n.id,
        n.title,
        n.description,
        n.symbol,

        v.nominee_id
    FROM public.family_award_editions e
    JOIN public.family_award_categories c
      ON c.edition_id = e.id
    JOIN public.family_award_nominees n
      ON n.category_id = c.id
    LEFT JOIN public.family_award_votes v
      ON v.category_id = c.id
     AND v.voter_id = (SELECT auth.uid())
    WHERE e.status = 'voting'
      AND e.voting_ends_at > now()
    ORDER BY
        e.year DESC,
        c.display_order,
        n.display_order,
        n.title;
END;
$$;


-- ==========================================
-- 8. RESUMEN PARA EL ADMINISTRADOR
-- Sin exponer quién votó ni resultados.
-- ==========================================

CREATE FUNCTION public.admin_family_awards_voting_overview()
RETURNS TABLE (
    edition_id UUID,
    edition_year INTEGER,
    edition_title TEXT,
    edition_status TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    category_count INTEGER,
    nominee_count INTEGER,
    incomplete_categories INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM public.family_awards_assert_admin();

    RETURN QUERY
    SELECT
        e.id,
        e.year,
        e.title,
        e.status,
        e.voting_starts_at,
        e.voting_ends_at,

        (
            SELECT count(*)::INTEGER
            FROM public.family_award_categories c
            WHERE c.edition_id = e.id
        ),

        (
            SELECT count(*)::INTEGER
            FROM public.family_award_nominees n
            JOIN public.family_award_categories c
              ON c.id = n.category_id
            WHERE c.edition_id = e.id
        ),

        (
            SELECT count(*)::INTEGER
            FROM public.family_award_categories c
            WHERE c.edition_id = e.id
              AND (
                  SELECT count(*)
                  FROM public.family_award_nominees n
                  WHERE n.category_id = c.id
              ) < 2
        )
    FROM public.family_award_editions e
    ORDER BY e.year DESC;
END;
$$;


-- ==========================================
-- 9. PERMISOS DE EJECUCIÓN
-- ==========================================

REVOKE ALL ON FUNCTION
public.admin_family_awards_set_voting_dates(
    UUID, TIMESTAMPTZ, TIMESTAMPTZ
)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_family_awards_open_voting(UUID)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_family_awards_close_voting(UUID)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.family_awards_cast_vote(UUID, UUID)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.family_awards_voting_catalog()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_family_awards_voting_overview()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_family_awards_set_voting_dates(
    UUID, TIMESTAMPTZ, TIMESTAMPTZ
)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_family_awards_open_voting(UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_family_awards_close_voting(UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.family_awards_cast_vote(UUID, UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.family_awards_voting_catalog()
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_family_awards_voting_overview()
TO authenticated;

COMMIT;
