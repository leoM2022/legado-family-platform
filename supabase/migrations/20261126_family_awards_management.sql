
BEGIN;

-- =====================================================
-- 1. TABLAS PRIVADAS
-- Son independientes de las tablas de la demo.
-- =====================================================

CREATE TABLE public.family_award_editions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    year INTEGER NOT NULL UNIQUE
        CHECK (year BETWEEN 2020 AND 2100),

    title TEXT NOT NULL
        CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (
            status IN (
                'draft',
                'voting',
                'closed',
                'published'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.family_award_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    edition_id UUID NOT NULL
        REFERENCES public.family_award_editions(id)
        ON DELETE RESTRICT,

    slug TEXT NOT NULL
        CHECK (
            slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        ),

    title TEXT NOT NULL
        CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),

    description TEXT NOT NULL DEFAULT ''
        CHECK (char_length(description) <= 500),

    display_order INTEGER NOT NULL DEFAULT 0
        CHECK (display_order >= 0),

    UNIQUE (edition_id, slug)
);

CREATE TABLE public.family_award_nominees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category_id UUID NOT NULL
        REFERENCES public.family_award_categories(id)
        ON DELETE RESTRICT,

    title TEXT NOT NULL
        CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),

    description TEXT NOT NULL DEFAULT ''
        CHECK (char_length(description) <= 500),

    symbol TEXT NOT NULL DEFAULT '🏆'
        CHECK (char_length(symbol) BETWEEN 1 AND 12),

    display_order INTEGER NOT NULL DEFAULT 0
        CHECK (display_order >= 0),

    -- Opcional: vincular a un familiar registrado.
    family_user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    UNIQUE (category_id, title)
);

CREATE INDEX family_award_categories_edition_idx
ON public.family_award_categories(edition_id);

CREATE INDEX family_award_nominees_category_idx
ON public.family_award_nominees(category_id);

CREATE INDEX family_award_nominees_user_idx
ON public.family_award_nominees(family_user_id);


-- =====================================================
-- 2. SEGURIDAD
-- Sin acceso directo mediante Supabase JS.
-- =====================================================

ALTER TABLE public.family_award_editions
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.family_award_categories
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.family_award_nominees
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON
    public.family_award_editions,
    public.family_award_categories,
    public.family_award_nominees
FROM PUBLIC, anon, authenticated;


-- =====================================================
-- 3. VERIFICACIÓN DE ADMINISTRADOR
-- =====================================================

CREATE FUNCTION public.family_awards_assert_admin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'admin'
          AND p.approval_status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Acceso administrativo denegado'
        USING ERRCODE = '42501';
    END IF;
END;
$$;


-- =====================================================
-- 4. CREAR O EDITAR UNA EDICIÓN
-- Solo se permite editar borradores.
-- =====================================================

CREATE FUNCTION public.admin_family_awards_upsert_edition(
    p_id UUID,
    p_year INTEGER,
    p_title TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id UUID;
BEGIN
    PERFORM public.family_awards_assert_admin();

    IF p_year IS NULL
       OR p_year NOT BETWEEN 2020 AND 2100
       OR char_length(
           btrim(coalesce(p_title, ''))
       ) NOT BETWEEN 1 AND 120
    THEN
        RAISE EXCEPTION 'Datos de edición inválidos';
    END IF;

    IF p_id IS NULL THEN
        INSERT INTO public.family_award_editions (
            year,
            title
        )
        VALUES (
            p_year,
            btrim(p_title)
        )
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.family_award_editions e
        SET
            year = p_year,
            title = btrim(p_title)
        WHERE e.id = p_id
          AND e.status = 'draft'
        RETURNING e.id INTO v_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'La edición no existe o ya no es borrador';
        END IF;
    END IF;

    RETURN v_id;
END;
$$;


-- =====================================================
-- 5. CREAR O EDITAR UNA CATEGORÍA
-- =====================================================

CREATE FUNCTION public.admin_family_awards_upsert_category(
    p_id UUID,
    p_edition_id UUID,
    p_slug TEXT,
    p_title TEXT,
    p_description TEXT,
    p_display_order INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id UUID;
    v_slug TEXT := lower(btrim(coalesce(p_slug, '')));
BEGIN
    PERFORM public.family_awards_assert_admin();

    IF p_edition_id IS NULL
       OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       OR char_length(v_slug) > 80
       OR char_length(
           btrim(coalesce(p_title, ''))
       ) NOT BETWEEN 1 AND 120
       OR char_length(coalesce(p_description, '')) > 500
       OR p_display_order IS NULL
       OR p_display_order < 0
    THEN
        RAISE EXCEPTION 'Datos de categoría inválidos';
    END IF;

    -- La edición de destino debe ser borrador.
    IF NOT EXISTS (
        SELECT 1
        FROM public.family_award_editions e
        WHERE e.id = p_edition_id
          AND e.status = 'draft'
    ) THEN
        RAISE EXCEPTION 'La edición no permite cambios';
    END IF;

    IF p_id IS NULL THEN
        INSERT INTO public.family_award_categories (
            edition_id,
            slug,
            title,
            description,
            display_order
        )
        VALUES (
            p_edition_id,
            v_slug,
            btrim(p_title),
            btrim(coalesce(p_description, '')),
            p_display_order
        )
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.family_award_categories c
        SET
            edition_id = p_edition_id,
            slug = v_slug,
            title = btrim(p_title),
            description = btrim(coalesce(p_description, '')),
            display_order = p_display_order
        WHERE c.id = p_id
          AND EXISTS (
              SELECT 1
              FROM public.family_award_editions old_e
              WHERE old_e.id = c.edition_id
                AND old_e.status = 'draft'
          )
        RETURNING c.id INTO v_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'Categoría inexistente o bloqueada';
        END IF;
    END IF;

    RETURN v_id;
END;
$$;


-- =====================================================
-- 6. CREAR O EDITAR UN NOMINADO
-- Puede ser una persona, momento o acontecimiento.
-- =====================================================

CREATE FUNCTION public.admin_family_awards_upsert_nominee(
    p_id UUID,
    p_category_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_symbol TEXT,
    p_display_order INTEGER,
    p_family_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id UUID;
    v_symbol TEXT :=
        coalesce(nullif(btrim(p_symbol), ''), '🏆');
BEGIN
    PERFORM public.family_awards_assert_admin();

    IF p_category_id IS NULL
       OR char_length(
           btrim(coalesce(p_title, ''))
       ) NOT BETWEEN 1 AND 120
       OR char_length(coalesce(p_description, '')) > 500
       OR char_length(v_symbol) > 12
       OR p_display_order IS NULL
       OR p_display_order < 0
    THEN
        RAISE EXCEPTION 'Datos de nominado inválidos';
    END IF;

    -- Solo se modifican ternas de ediciones borrador.
    IF NOT EXISTS (
        SELECT 1
        FROM public.family_award_categories c
        JOIN public.family_award_editions e
          ON e.id = c.edition_id
        WHERE c.id = p_category_id
          AND e.status = 'draft'
    ) THEN
        RAISE EXCEPTION 'La categoría no permite cambios';
    END IF;

    -- Si elegimos un familiar, debe estar aprobado.
    IF p_family_user_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.profiles p
           WHERE p.id = p_family_user_id
             AND p.approval_status = 'approved'
       )
    THEN
        RAISE EXCEPTION
            'El familiar seleccionado no está aprobado';
    END IF;

    IF p_id IS NULL THEN
        INSERT INTO public.family_award_nominees (
            category_id,
            title,
            description,
            symbol,
            display_order,
            family_user_id
        )
        VALUES (
            p_category_id,
            btrim(p_title),
            btrim(coalesce(p_description, '')),
            v_symbol,
            p_display_order,
            p_family_user_id
        )
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.family_award_nominees n
        SET
            category_id = p_category_id,
            title = btrim(p_title),
            description = btrim(coalesce(p_description, '')),
            symbol = v_symbol,
            display_order = p_display_order,
            family_user_id = p_family_user_id
        WHERE n.id = p_id
          AND EXISTS (
              SELECT 1
              FROM public.family_award_categories old_c
              JOIN public.family_award_editions old_e
                ON old_e.id = old_c.edition_id
              WHERE old_c.id = n.category_id
                AND old_e.status = 'draft'
          )
        RETURNING n.id INTO v_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'Nominado inexistente o bloqueado';
        END IF;
    END IF;

    RETURN v_id;
END;
$$;


-- =====================================================
-- 7. CONSULTAR DATOS PARA EL PANEL ADMINISTRATIVO
-- Se devuelve JSON con las cuatro colecciones.
-- =====================================================

CREATE FUNCTION public.admin_family_awards_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM public.family_awards_assert_admin();

    RETURN jsonb_build_object(

        'editions',
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', e.id,
                    'year', e.year,
                    'title', e.title,
                    'status', e.status
                )
                ORDER BY e.year DESC
            )
            FROM public.family_award_editions e
        ), '[]'::jsonb),

        'categories',
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', c.id,
                    'edition_id', c.edition_id,
                    'slug', c.slug,
                    'title', c.title,
                    'description', c.description,
                    'display_order', c.display_order
                )
                ORDER BY c.display_order, c.title
            )
            FROM public.family_award_categories c
        ), '[]'::jsonb),

        'nominees',
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', n.id,
                    'category_id', n.category_id,
                    'title', n.title,
                    'description', n.description,
                    'symbol', n.symbol,
                    'display_order', n.display_order,
                    'family_user_id', n.family_user_id
                )
                ORDER BY n.display_order, n.title
            )
            FROM public.family_award_nominees n
        ), '[]'::jsonb),

        'members',
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'display_name', p.display_name
                )
                ORDER BY p.display_name
            )
            FROM public.profiles p
            WHERE p.approval_status = 'approved'
        ), '[]'::jsonb)
    );
END;
$$;


-- =====================================================
-- 8. PERMISOS DE FUNCIONES
-- =====================================================

REVOKE ALL ON FUNCTION
public.family_awards_assert_admin()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_family_awards_upsert_edition(
    UUID, INTEGER, TEXT
)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_family_awards_upsert_category(
    UUID, UUID, TEXT, TEXT, TEXT, INTEGER
)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_family_awards_upsert_nominee(
    UUID, UUID, TEXT, TEXT, TEXT, INTEGER, UUID
)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_family_awards_dashboard()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.family_awards_assert_admin()
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_family_awards_upsert_edition(
    UUID, INTEGER, TEXT
)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_family_awards_upsert_category(
    UUID, UUID, TEXT, TEXT, TEXT, INTEGER
)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_family_awards_upsert_nominee(
    UUID, UUID, TEXT, TEXT, TEXT, INTEGER, UUID
)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_family_awards_dashboard()
TO authenticated;

COMMIT;
