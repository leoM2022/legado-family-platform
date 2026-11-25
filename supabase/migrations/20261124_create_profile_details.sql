
CREATE TABLE public.profile_details (
    user_id UUID PRIMARY KEY
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    nickname TEXT DEFAULT '',
    birthday_day INTEGER,
    birthday_month INTEGER,

    current_status TEXT DEFAULT '',
    favorite_food TEXT DEFAULT '',
    favorite_color TEXT DEFAULT '',
    currently_into TEXT DEFAULT '',

    -- Preferencias de privacidad
    show_nickname BOOLEAN NOT NULL DEFAULT FALSE,
    show_birthday BOOLEAN NOT NULL DEFAULT FALSE,
    show_status BOOLEAN NOT NULL DEFAULT FALSE,
    show_favorites BOOLEAN NOT NULL DEFAULT FALSE,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT valid_birthday CHECK (
        (
            birthday_day IS NULL
            AND birthday_month IS NULL
        )
        OR (
            birthday_month BETWEEN 1 AND 12
            AND birthday_day BETWEEN 1 AND
                CASE
                    WHEN birthday_month = 2 THEN 29
                    WHEN birthday_month IN (4, 6, 9, 11)
                        THEN 30
                    ELSE 31
                END
        )
    )
);

-- Activar seguridad
ALTER TABLE public.profile_details
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profile_details
FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.profile_details
TO authenticated;

-- Solo el propietario puede consultar sus datos
CREATE POLICY "owner_read_details"
ON public.profile_details
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = user_id
);

-- Solo usuarios aprobados pueden crear sus datos
CREATE POLICY "owner_insert_details"
ON public.profile_details
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.approval_status = 'approved'
    )
);

-- Solo usuarios aprobados pueden modificarlos
CREATE POLICY "owner_update_details"
ON public.profile_details
FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) = user_id
)
WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.approval_status = 'approved'
    )
);
