
BEGIN;

-- 1. Comprobar acceso a una publicación.
-- SECURITY DEFINER permite verificar el post
-- sin depender de la política de lectura del autor.

CREATE FUNCTION public.can_access_family_post(
    p_post_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.family_posts fp
        JOIN public.profiles author
          ON author.id = fp.author_id
        WHERE fp.id = p_post_id
          AND author.approval_status = 'approved'
          AND EXISTS (
              SELECT 1
              FROM public.profiles viewer
              WHERE viewer.id = (SELECT auth.uid())
                AND viewer.approval_status = 'approved'
          )
    );
$$;

REVOKE ALL ON FUNCTION
public.can_access_family_post(UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.can_access_family_post(UUID)
TO authenticated;


-- 2. COMENTARIOS

CREATE TABLE public.family_post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID NOT NULL
        REFERENCES public.family_posts(id)
        ON DELETE CASCADE,

    author_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    content TEXT NOT NULL
        CHECK (
            char_length(btrim(content))
            BETWEEN 1 AND 500
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX family_comments_post_idx
ON public.family_post_comments (
    post_id,
    created_at
);

ALTER TABLE public.family_post_comments
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.family_post_comments
FROM anon, authenticated;

GRANT SELECT, DELETE
ON public.family_post_comments
TO authenticated;

GRANT INSERT (post_id, author_id, content)
ON public.family_post_comments
TO authenticated;

-- Los familiares aprobados pueden leer comentarios.
CREATE POLICY "approved_read_comments"
ON public.family_post_comments
FOR SELECT
TO authenticated
USING (
    public.can_access_family_post(post_id)
);

-- Solo pueden publicar comentarios propios.
CREATE POLICY "approved_create_comments"
ON public.family_post_comments
FOR INSERT
TO authenticated
WITH CHECK (
    author_id = (SELECT auth.uid())
    AND public.can_access_family_post(post_id)
);

-- Solo el autor puede eliminar su comentario.
CREATE POLICY "author_delete_comments"
ON public.family_post_comments
FOR DELETE
TO authenticated
USING (
    author_id = (SELECT auth.uid())
    AND public.can_access_family_post(post_id)
);


-- 3. REACCIONES

CREATE TABLE public.family_post_reactions (
    post_id UUID NOT NULL
        REFERENCES public.family_posts(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    reaction_type TEXT NOT NULL
        CHECK (
            reaction_type IN (
                'like',
                'love',
                'laugh'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX family_reactions_user_idx
ON public.family_post_reactions(user_id);

ALTER TABLE public.family_post_reactions
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.family_post_reactions
FROM anon, authenticated;

GRANT SELECT, UPDATE, DELETE
ON public.family_post_reactions
TO authenticated;

GRANT INSERT (post_id, user_id, reaction_type)
ON public.family_post_reactions
TO authenticated;

CREATE POLICY "approved_read_reactions"
ON public.family_post_reactions
FOR SELECT
TO authenticated
USING (
    public.can_access_family_post(post_id)
);

CREATE POLICY "approved_create_reactions"
ON public.family_post_reactions
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.can_access_family_post(post_id)
);

CREATE POLICY "owner_update_reactions"
ON public.family_post_reactions
FOR UPDATE
TO authenticated
USING (
    user_id = (SELECT auth.uid())
    AND public.can_access_family_post(post_id)
)
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.can_access_family_post(post_id)
);

CREATE POLICY "owner_delete_reactions"
ON public.family_post_reactions
FOR DELETE
TO authenticated
USING (
    user_id = (SELECT auth.uid())
    AND public.can_access_family_post(post_id)
);

COMMIT;
