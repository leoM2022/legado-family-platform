
BEGIN;

-- 1. Registrar cuándo se edita contenido.
ALTER TABLE public.family_posts
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

ALTER TABLE public.family_post_comments
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- 2. Historial de moderación.
-- Guardamos identificadores y motivos, no el contenido
-- eliminado, para evitar conservar información innecesaria.
CREATE TABLE public.family_moderation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    moderator_id UUID NOT NULL,
    target_author_id UUID NOT NULL,
    target_id UUID NOT NULL,

    target_kind TEXT NOT NULL
        CHECK (target_kind IN ('post', 'comment')),

    reason TEXT NOT NULL
        CHECK (char_length(btrim(reason)) BETWEEN 5 AND 200),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX family_moderation_recent_idx
ON public.family_moderation_events(created_at DESC);

ALTER TABLE public.family_moderation_events
ENABLE ROW LEVEL SECURITY;

-- Nadie consulta o modifica directamente
-- el historial desde el cliente.
REVOKE ALL ON public.family_moderation_events
FROM PUBLIC, anon, authenticated;


-- 3. Editar solamente contenido propio.
CREATE FUNCTION public.edit_family_content(
    p_kind TEXT,
    p_id UUID,
    p_content TEXT
)
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
          AND p.approval_status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Acceso denegado'
            USING ERRCODE = '42501';
    END IF;

    IF p_kind IS NULL
       OR p_kind NOT IN ('post', 'comment')
       OR p_id IS NULL
       OR p_content IS NULL
       OR char_length(btrim(p_content)) < 1
       OR (
    p_kind = 'post'
    AND char_length(btrim(p_content)) > 1200
)
OR (
    p_kind = 'comment'
    AND char_length(btrim(p_content)) > 500
)
    THEN
        RAISE EXCEPTION 'Contenido inválido';
    END IF;

    IF p_kind = 'post' THEN
        UPDATE public.family_posts fp
        SET content = btrim(p_content),
            edited_at = now()
        WHERE fp.id = p_id
          AND fp.author_id = (SELECT auth.uid());

    ELSE
        UPDATE public.family_post_comments c
        SET content = btrim(p_content),
            edited_at = now()
        WHERE c.id = p_id
          AND c.author_id = (SELECT auth.uid())
          AND public.can_access_family_post(c.post_id);
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contenido no encontrado o sin permisos'
            USING ERRCODE = '42501';
    END IF;
END;
$$;


-- 4. Moderación exclusiva de administradores.
CREATE FUNCTION public.moderate_family_content(
    p_kind TEXT,
    p_id UUID,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_author_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.approval_status = 'approved'
          AND p.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Solo administradores autorizados'
            USING ERRCODE = '42501';
    END IF;

    IF p_kind IS NULL
       OR p_kind NOT IN ('post', 'comment')
       OR p_id IS NULL
       OR p_reason IS NULL
       OR char_length(btrim(p_reason)) NOT BETWEEN 5 AND 200
    THEN
        RAISE EXCEPTION 'Datos de moderación inválidos';
    END IF;

    IF p_kind = 'post' THEN
        DELETE FROM public.family_posts fp
        WHERE fp.id = p_id
        RETURNING fp.author_id INTO v_author_id;
    ELSE
        DELETE FROM public.family_post_comments c
        WHERE c.id = p_id
        RETURNING c.author_id INTO v_author_id;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contenido no encontrado';
    END IF;

    -- Guardar quién moderó, qué retiró y por qué.
    INSERT INTO public.family_moderation_events (
        moderator_id,
        target_author_id,
        target_id,
        target_kind,
        reason
    )
    VALUES (
        (SELECT auth.uid()),
        v_author_id,
        p_id,
        p_kind,
        btrim(p_reason)
    );
END;
$$;


-- 5. Permisos de ejecución.
REVOKE ALL ON FUNCTION
public.edit_family_content(TEXT, UUID, TEXT)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.moderate_family_content(TEXT, UUID, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.edit_family_content(TEXT, UUID, TEXT)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.moderate_family_content(TEXT, UUID, TEXT)
TO authenticated;

COMMIT;
