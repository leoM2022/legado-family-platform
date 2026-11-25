
-- Etapa 11: directorio familiar privado

ALTER TABLE public.profile_details
ADD COLUMN IF NOT EXISTS show_in_directory
BOOLEAN NOT NULL DEFAULT FALSE;

-- Solo miembros aprobados pueden consultar
-- la información que cada familiar autorizó compartir.

CREATE OR REPLACE FUNCTION public.get_family_directory()
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    nickname TEXT,
    birthday_day INTEGER,
    birthday_month INTEGER,
    current_status TEXT,
    favorite_food TEXT,
    favorite_color TEXT,
    currently_into TEXT
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
        END

    FROM public.profiles p
    JOIN public.profile_details d
      ON d.user_id = p.id

    WHERE p.approval_status = 'approved'
      AND d.show_in_directory = TRUE

    ORDER BY p.display_name, p.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_family_directory()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_family_directory()
TO authenticated;
