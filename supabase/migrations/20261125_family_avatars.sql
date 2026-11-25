
BEGIN;

-- Datos del avatar y permisos independientes.
ALTER TABLE public.profile_details
ADD COLUMN IF NOT EXISTS avatar_path TEXT,
ADD COLUMN IF NOT EXISTS show_avatar BOOLEAN
    NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allow_awards_avatar BOOLEAN
    NOT NULL DEFAULT FALSE;

-- Nadie podrá asociar a su perfil un archivo
-- ubicado dentro de la carpeta de otro usuario.
ALTER TABLE public.profile_details
ADD CONSTRAINT avatar_path_belongs_to_user
CHECK (
    avatar_path IS NULL
    OR avatar_path LIKE (
        user_id::TEXT || '/%.webp'
    )
);

-- Bucket privado, con imágenes WebP de hasta 1 MB.
INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'family-avatars',
    'family-avatars',
    FALSE,
    1048576,
    ARRAY['image/webp']::TEXT[]
)
ON CONFLICT (id)
DO UPDATE SET
    public = FALSE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Verifica si un miembro puede consultar una foto.
CREATE OR REPLACE FUNCTION
public.can_view_family_avatar(p_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles viewer
        JOIN public.profile_details d
          ON d.avatar_path = p_path
        JOIN public.profiles owner
          ON owner.id = d.user_id
        WHERE viewer.id = (SELECT auth.uid())
          AND viewer.approval_status = 'approved'
          AND owner.approval_status = 'approved'
          AND d.show_in_directory = TRUE
          AND d.show_avatar = TRUE
    );
$$;

REVOKE ALL ON FUNCTION
public.can_view_family_avatar(TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.can_view_family_avatar(TEXT)
TO authenticated;

-- Subir fotos: solo la cuenta aprobada,
-- dentro de su propia carpeta.
CREATE POLICY "family_avatar_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'family-avatars'
    AND (storage.foldername(name))[1] =
        (SELECT auth.uid())::TEXT
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.approval_status = 'approved'
    )
);

-- Leer fotos propias o autorizadas para la familia.
CREATE POLICY "family_avatar_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'family-avatars'
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
        OR public.can_view_family_avatar(name)
    )
);

-- Borrar únicamente los propios archivos.
CREATE POLICY "family_avatar_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'family-avatars'
    AND (storage.foldername(name))[1] =
        (SELECT auth.uid())::TEXT
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.approval_status = 'approved'
    )
);

COMMIT;


BEGIN;

DROP FUNCTION public.get_family_directory();

CREATE FUNCTION public.get_family_directory()
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    nickname TEXT,
    birthday_day INTEGER,
    birthday_month INTEGER,
    current_status TEXT,
    favorite_food TEXT,
    favorite_color TEXT,
    currently_into TEXT,
    avatar_path TEXT
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
        p.id,
        p.display_name,
        CASE WHEN d.show_nickname
            THEN NULLIF(BTRIM(d.nickname), '')
            ELSE NULL
        END,
        CASE WHEN d.show_birthday
            THEN d.birthday_day
            ELSE NULL
        END,
        CASE WHEN d.show_birthday
            THEN d.birthday_month
            ELSE NULL
        END,
        CASE WHEN d.show_status
            THEN NULLIF(BTRIM(d.current_status), '')
            ELSE NULL
        END,
        CASE WHEN d.show_favorites
            THEN NULLIF(BTRIM(d.favorite_food), '')
            ELSE NULL
        END,
        CASE WHEN d.show_favorites
            THEN NULLIF(BTRIM(d.favorite_color), '')
            ELSE NULL
        END,
        CASE WHEN d.show_favorites
            THEN NULLIF(BTRIM(d.currently_into), '')
            ELSE NULL
        END,
        CASE WHEN d.show_avatar
            THEN d.avatar_path
            ELSE NULL
        END
    FROM public.profiles p
    JOIN public.profile_details d
      ON d.user_id = p.id
    WHERE p.approval_status = 'approved'
      AND d.show_in_directory = TRUE
    ORDER BY p.display_name, p.id;
END;
$$;

REVOKE ALL ON FUNCTION
public.get_family_directory()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.get_family_directory()
TO authenticated;

COMMIT;
