
BEGIN;

-- Estado persistente de pausa.
ALTER TABLE public.family_ceremony_sessions
ADD COLUMN paused_at TIMESTAMPTZ;

-- Impide avanzar la ceremonia mientras está pausada.
-- Si una transición intenta revelar un ganador,
-- la transacción completa se cancela.
CREATE FUNCTION public.family_ceremony_guard_pause()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.paused_at IS NOT NULL
     AND NEW.paused_at IS NOT DISTINCT FROM OLD.paused_at
     AND (
       NEW.phase IS DISTINCT FROM OLD.phase
       OR NEW.current_category_id
          IS DISTINCT FROM OLD.current_category_id
     )
  THEN
    RAISE EXCEPTION
      'La ceremonia está pausada. Reanudala primero.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER family_ceremony_pause_guard
BEFORE UPDATE ON public.family_ceremony_sessions
FOR EACH ROW
EXECUTE FUNCTION public.family_ceremony_guard_pause();

-- Solo un administrador puede pausar o reanudar.
CREATE FUNCTION public.admin_ceremony_set_paused(
  p_edition_id UUID,
  p_paused BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
  v_phase TEXT;
BEGIN
  PERFORM public.family_awards_assert_admin();

  IF p_paused IS NULL THEN
    RAISE EXCEPTION 'Estado de pausa inválido';
  END IF;

  SELECT e.status
  INTO v_status
  FROM public.family_award_editions e
  WHERE e.id = p_edition_id
  FOR UPDATE;

  IF v_status IS DISTINCT FROM 'closed' THEN
    RAISE EXCEPTION
      'La edición no admite cambios de pausa';
  END IF;

  SELECT s.phase
  INTO v_phase
  FROM public.family_ceremony_sessions s
  WHERE s.edition_id = p_edition_id
  FOR UPDATE;

  IF v_phase IS NULL OR v_phase = 'finished' THEN
    RAISE EXCEPTION
      'No existe una ceremonia activa';
  END IF;

  UPDATE public.family_ceremony_sessions s
  SET
    paused_at = CASE
      WHEN p_paused THEN clock_timestamp()
      ELSE NULL
    END,
    updated_at = clock_timestamp()
  WHERE s.edition_id = p_edition_id;
END;
$$;

-- Estado consultable sin revelar ganadores.
CREATE FUNCTION public.family_ceremony_pause_status(
  p_edition_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_paused BOOLEAN;
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

  SELECT s.paused_at IS NOT NULL
  INTO v_paused
  FROM public.family_ceremony_sessions s
  WHERE s.edition_id = p_edition_id;

  RETURN coalesce(v_paused, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION
public.family_ceremony_guard_pause()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_ceremony_set_paused(UUID, BOOLEAN)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.family_ceremony_pause_status(UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_ceremony_set_paused(UUID, BOOLEAN)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.family_ceremony_pause_status(UUID)
TO authenticated;

COMMIT;
