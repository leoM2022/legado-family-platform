
-- Perfiles de usuarios de GoyaAwards

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    display_name TEXT NOT NULL DEFAULT '',

    approval_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            approval_status IN (
                'pending',
                'approved',
                'rejected'
            )
        ),

    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('admin', 'member')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ
);

-- Seguridad de perfiles
ALTER TABLE public.profiles
ENABLE ROW LEVEL SECURITY;

-- Nadie puede modificar roles ni aprobaciones
-- utilizando directamente el cliente público.
REVOKE ALL ON public.profiles
FROM anon, authenticated;

-- Un usuario autenticado puede leer su perfil
GRANT SELECT ON public.profiles TO authenticated;

CREATE POLICY "read_own_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);

-- Crear perfil al registrarse
CREATE OR REPLACE FUNCTION public.create_pending_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        display_name
    )
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(
                LEFT(
                    BTRIM(
                        NEW.raw_user_meta_data
                        ->> 'display_name'
                    ),
                    80
                ),
                ''
            ),
            'Usuario pendiente'
        )
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_pending_profile();

REVOKE ALL ON FUNCTION public.create_pending_profile()
FROM PUBLIC, anon, authenticated;
