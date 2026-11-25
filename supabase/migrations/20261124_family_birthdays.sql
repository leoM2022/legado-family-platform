
-- Calendario familiar de cumpleaños
-- Solo miembros aprobados pueden consultarlo.

CREATE OR REPLACE FUNCTION public.get_family_birthdays()
RETURNS TABLE (
    family_name TEXT,
    birthday_day INTEGER,
    birthday_month INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Solo usuarios aprobados pueden consultar.
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.approval_status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Acceso no autorizado'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        (
            CASE
                WHEN d.show_nickname = TRUE
                     AND NULLIF(BTRIM(d.nickname), '') IS NOT NULL
                THEN d.nickname
                ELSE p.display_name
            END
        )::TEXT AS family_name,
        d.birthday_day,
        d.birthday_month
    FROM public.profile_details d
    JOIN public.profiles p ON p.id = d.user_id
    WHERE p.approval_status = 'approved'
      AND d.show_birthday = TRUE
      AND d.birthday_day IS NOT NULL
      AND d.birthday_month IS NOT NULL
    ORDER BY
        d.birthday_month,
        d.birthday_day,
        p.display_name;
END;
$$;

-- Limitar quién puede ejecutar la función.
REVOKE ALL ON FUNCTION public.get_family_birthdays()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_family_birthdays()
TO authenticated;
