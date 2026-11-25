
-- GoyaAwards: publicaciones familiares

CREATE TABLE public.family_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    author_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    content TEXT NOT NULL
        CHECK (
            char_length(btrim(content))
            BETWEEN 1 AND 1200
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX family_posts_recent_idx
ON public.family_posts (created_at DESC);

ALTER TABLE public.family_posts
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.family_posts
FROM anon, authenticated;

GRANT SELECT, INSERT, DELETE
ON public.family_posts TO authenticated;

-- Lectura directa: el autor puede leer sus posts.
-- Para leer el muro completo utilizaremos una
-- función segura que verifica la aprobación.

CREATE POLICY "author_read_posts"
ON public.family_posts
FOR SELECT TO authenticated
USING (
    author_id = (SELECT auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.approval_status = 'approved'
    )
);

-- Crear: solamente el propietario aprobado.
CREATE POLICY "approved_author_create_post"
ON public.family_posts
FOR INSERT TO authenticated
WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.approval_status = 'approved'
    )
);

-- Eliminar: solamente el autor aprobado.
CREATE POLICY "author_delete_post"
ON public.family_posts
FOR DELETE TO authenticated
USING (
    author_id = (SELECT auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.approval_status = 'approved'
    )
);

-- Consultar el muro familiar.
CREATE FUNCTION public.get_family_feed()
RETURNS TABLE (
    post_id UUID,
    author_id UUID,
    author_name TEXT,
    content TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles viewer
        WHERE viewer.id = (SELECT auth.uid())
          AND viewer.approval_status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Acceso no autorizado'
        USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        post.id,
        post.author_id,
        author.display_name,
        post.content,
        post.created_at
    FROM public.family_posts post
    JOIN public.profiles author
      ON author.id = post.author_id
    WHERE author.approval_status = 'approved'
    ORDER BY post.created_at DESC
    LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.get_family_feed()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_family_feed()
TO authenticated;
