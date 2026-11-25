
-- Recuperar comentarios de publicaciones familiares.
-- Solo usuarios aprobados pueden ejecutar la consulta.

CREATE OR REPLACE FUNCTION
public.get_family_post_comments(p_post_ids UUID[])
RETURNS TABLE (
    comment_id UUID,
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
    -- Verificar la identidad y aprobación.
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.approval_status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Acceso no autorizado'
        USING ERRCODE = '42501';
    END IF;

    -- Limitar la cantidad de publicaciones consultadas.
    IF p_post_ids IS NULL
       OR cardinality(p_post_ids) > 50
    THEN
        RAISE EXCEPTION 'Consulta inválida';
    END IF;

    RETURN QUERY
    SELECT
        c.id,
        c.post_id,
        c.author_id,
        author.display_name,
        c.content,
        c.created_at
    FROM public.family_post_comments c
    JOIN public.profiles author
      ON author.id = c.author_id
    JOIN public.family_posts post
      ON post.id = c.post_id
    JOIN public.profiles post_author
      ON post_author.id = post.author_id
    WHERE c.post_id = ANY(p_post_ids)
      AND author.approval_status = 'approved'
      AND post_author.approval_status = 'approved'
    ORDER BY c.created_at DESC
    LIMIT 500;
END;
$$;

REVOKE ALL ON FUNCTION
public.get_family_post_comments(UUID[])
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.get_family_post_comments(UUID[])
TO authenticated;
