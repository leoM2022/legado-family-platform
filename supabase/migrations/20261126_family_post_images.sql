
BEGIN;

-- Una foto por publicación.
ALTER TABLE public.family_posts
ADD COLUMN IF NOT EXISTS image_path TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS family_posts_image_path_unique
ON public.family_posts (image_path)
WHERE image_path IS NOT NULL;

-- La imagen debe pertenecer a la carpeta del autor.
ALTER TABLE public.family_posts
ADD CONSTRAINT family_posts_image_owner_path
CHECK (
    image_path IS NULL OR image_path ~ (
        '^' || author_id::TEXT ||
        '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$'
    )
);

-- Las publicaciones normales siguen siendo de texto.
-- Solo una función segura puede vincular una fotografía.
DROP POLICY IF EXISTS "approved_author_create_post"
ON public.family_posts;

CREATE POLICY "approved_author_create_post"
ON public.family_posts
FOR INSERT TO authenticated
WITH CHECK (
    author_id = (SELECT auth.uid())
    AND image_path IS NULL
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.approval_status = 'approved'
    )
);

-- Bucket privado para fotos de publicaciones.
INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'family-post-images',
    'family-post-images',
    FALSE,
    2097152,
    ARRAY['image/webp']::TEXT[]
)
ON CONFLICT (id)
DO UPDATE SET
    public = FALSE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Comprobar si una cuenta es administradora.
CREATE OR REPLACE FUNCTION
public.is_approved_family_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.approval_status = 'approved'
          AND p.role = 'admin'
    );
$$;

-- Comprobar si una imagen corresponde a una
-- publicación visible para familiares aprobados.
CREATE OR REPLACE FUNCTION
public.can_view_family_post_image(p_path TEXT)
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
        WHERE fp.image_path = p_path
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
public.is_approved_family_admin()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.can_view_family_post_image(TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.is_approved_family_admin()
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.can_view_family_post_image(TEXT)
TO authenticated;

-- Subida: solo usuarios aprobados,
-- dentro de su propia carpeta.
CREATE POLICY "family_post_images_upload"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'family-post-images'
    AND name ~ (
        '^' || (SELECT auth.uid())::TEXT ||
        '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$'
    )
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.approval_status = 'approved'
    )
);

-- Lectura: fotos propias, fotos publicadas
-- y acceso administrativo para moderación.
CREATE POLICY "family_post_images_read"
ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'family-post-images'
    AND (
        (
            (storage.foldername(name))[1] =
                (SELECT auth.uid())::TEXT
            AND EXISTS (
                SELECT 1
                FROM public.profiles p
                WHERE p.id = (SELECT auth.uid())
                  AND p.approval_status = 'approved'
            )
        )
        OR public.can_view_family_post_image(name)
        OR public.is_approved_family_admin()
    )
);

-- Borrado: archivos propios o moderados por admin.
CREATE POLICY "family_post_images_delete"
ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'family-post-images'
    AND (
        (
            (storage.foldername(name))[1] =
                (SELECT auth.uid())::TEXT
            AND EXISTS (
                SELECT 1
                FROM public.profiles p
                WHERE p.id = (SELECT auth.uid())
                  AND p.approval_status = 'approved'
            )
        )
        OR public.is_approved_family_admin()
    )
);

-- Crear publicación con fotografía.
CREATE FUNCTION public.create_family_post_with_image(
    p_content TEXT,
    p_image_path TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := (SELECT auth.uid());
    v_post_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = v_user_id
          AND p.approval_status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Cuenta no aprobada'
            USING ERRCODE = '42501';
    END IF;

    IF p_content IS NULL
       OR char_length(btrim(p_content)) NOT BETWEEN 1 AND 1200
    THEN
        RAISE EXCEPTION 'Texto inválido';
    END IF;

    IF p_image_path IS NOT NULL THEN
        -- Asegurar que la ruta pertenezca al usuario.
        IF p_image_path !~ (
            '^' || v_user_id::TEXT ||
            '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$'
        ) THEN
            RAISE EXCEPTION 'Ruta no autorizada'
                USING ERRCODE = '42501';
        END IF;

        -- Comprobar que el archivo exista en Storage.
        IF NOT EXISTS (
            SELECT 1
            FROM storage.objects o
            WHERE o.bucket_id = 'family-post-images'
              AND o.name = p_image_path
        ) THEN
            RAISE EXCEPTION 'La imagen no está almacenada';
        END IF;
    END IF;

    INSERT INTO public.family_posts (
        author_id,
        content,
        image_path
    )
    VALUES (
        v_user_id,
        btrim(p_content),
        p_image_path
    )
    RETURNING id INTO v_post_id;

    RETURN v_post_id;
END;
$$;

-- Recuperar las rutas de imágenes del muro.
CREATE FUNCTION public.get_family_post_images(
    p_post_ids UUID[]
)
RETURNS TABLE (
    post_id UUID,
    image_path TEXT
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

    IF p_post_ids IS NULL
       OR cardinality(p_post_ids) > 50
    THEN
        RAISE EXCEPTION 'Consulta inválida';
    END IF;

    RETURN QUERY
    SELECT fp.id, fp.image_path
    FROM public.family_posts fp
    JOIN public.profiles author
      ON author.id = fp.author_id
    WHERE fp.id = ANY(p_post_ids)
      AND fp.image_path IS NOT NULL
      AND author.approval_status = 'approved';
END;
$$;

-- Recuperar la ruta de una foto antes de moderar.
CREATE FUNCTION public.admin_get_post_image_path(
    p_post_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_path TEXT;
BEGIN
    IF NOT public.is_approved_family_admin() THEN
        RAISE EXCEPTION 'Acceso no autorizado'
            USING ERRCODE = '42501';
    END IF;

    SELECT fp.image_path
    INTO v_path
    FROM public.family_posts fp
    WHERE fp.id = p_post_id;

    RETURN v_path;
END;
$$;

-- Permisos de ejecución.
REVOKE ALL ON FUNCTION
public.create_family_post_with_image(TEXT, TEXT)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.get_family_post_images(UUID[])
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_get_post_image_path(UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.create_family_post_with_image(TEXT, TEXT)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.get_family_post_images(UUID[])
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_get_post_image_path(UUID)
TO authenticated;

COMMIT;
