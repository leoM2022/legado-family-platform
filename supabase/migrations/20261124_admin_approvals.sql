
-- GOYAAWARDS: Administración de solicitudes

-- 1. Consultar solicitudes pendientes
CREATE OR REPLACE FUNCTION
public.admin_list_pending_registrations()
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    email TEXT,
    requested_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Solo administradores aprobados
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'admin'
          AND p.approval_status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Acceso denegado'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.display_name,
        u.email::TEXT,
        p.created_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.approval_status = 'pending'
      AND u.email_confirmed_at IS NOT NULL
    ORDER BY p.created_at ASC;
END;
$$;


-- 2. Aprobar o rechazar una solicitud
CREATE OR REPLACE FUNCTION
public.admin_review_registration(
    p_user_id UUID,
    p_decision TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Comprobar quién realiza la operación
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'admin'
          AND p.approval_status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Acceso denegado'
            USING ERRCODE = '42501';
    END IF;

    -- Admitir solamente decisiones válidas
    IF p_user_id IS NULL
       OR p_decision IS NULL
       OR p_decision NOT IN ('approved', 'rejected')
    THEN
        RAISE EXCEPTION 'Solicitud inválida';
    END IF;

    -- No permitir autoaprobaciones
    IF p_user_id = (SELECT auth.uid()) THEN
        RAISE EXCEPTION 'No podés modificar tu propia cuenta';
    END IF;

    -- Actualizar solo cuentas pendientes y confirmadas
    UPDATE public.profiles p
    SET
        approval_status = p_decision,
        approved_at = CASE
            WHEN p_decision = 'approved' THEN now()
            ELSE NULL
        END
    WHERE p.id = p_user_id
      AND p.approval_status = 'pending'
      AND EXISTS (
          SELECT 1
          FROM auth.users u
          WHERE u.id = p.id
            AND u.email_confirmed_at IS NOT NULL
      );

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Solicitud inexistente o ya procesada';
    END IF;
END;
$$;


-- 3. Restringir la ejecución
REVOKE ALL ON FUNCTION
public.admin_list_pending_registrations()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_review_registration(UUID, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_list_pending_registrations()
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_review_registration(UUID, TEXT)
TO authenticated;
