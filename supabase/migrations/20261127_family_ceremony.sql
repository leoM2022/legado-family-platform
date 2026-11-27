
BEGIN;

-- Recuento definitivo por nominado.
CREATE TABLE public.family_award_tallies (
  category_id UUID NOT NULL
    REFERENCES public.family_award_categories(id)
    ON DELETE RESTRICT,
  nominee_id UUID NOT NULL,
  vote_count BIGINT NOT NULL CHECK (vote_count >= 0),
  PRIMARY KEY (category_id, nominee_id),
  FOREIGN KEY (nominee_id, category_id)
    REFERENCES public.family_award_nominees(id, category_id)
    ON DELETE RESTRICT
);

-- Ganador, desempate, guiones y video de cada terna.
CREATE TABLE public.family_award_results (
  category_id UUID PRIMARY KEY
    REFERENCES public.family_award_categories(id)
    ON DELETE RESTRICT,
  winner_nominee_id UUID,
  is_tie BOOLEAN NOT NULL,
  tie_reason TEXT,
  resolved_by UUID REFERENCES public.profiles(id)
    ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  intro_script TEXT NOT NULL DEFAULT ''
    CHECK (char_length(intro_script) <= 1200),
  winner_script TEXT NOT NULL DEFAULT ''
    CHECK (char_length(winner_script) <= 800),
  video_path TEXT UNIQUE,
  revealed_at TIMESTAMPTZ,
  FOREIGN KEY (winner_nominee_id, category_id)
    REFERENCES public.family_award_nominees(id, category_id)
    ON DELETE RESTRICT
);

-- Estado de la ceremonia.
CREATE TABLE public.family_ceremony_sessions (
  edition_id UUID PRIMARY KEY
    REFERENCES public.family_award_editions(id)
    ON DELETE RESTRICT,
  current_category_id UUID
    REFERENCES public.family_award_categories(id)
    ON DELETE RESTRICT,
  phase TEXT NOT NULL DEFAULT 'waiting'
    CHECK (
      phase IN (
        'waiting',
        'nominees',
        'revealed',
        'video',
        'finished'
      )
    ),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.family_award_tallies
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.family_award_results
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.family_ceremony_sessions
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON
  public.family_award_tallies,
  public.family_award_results,
  public.family_ceremony_sessions
FROM PUBLIC, anon, authenticated;


-- ==================================================
-- PREPARAR RESULTADOS DEFINITIVOS
-- Solo después del cierre.
-- No recalcula resultados ya preparados.
-- ==================================================

CREATE FUNCTION public.admin_ceremony_prepare(
  p_edition_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
  v_category RECORD;
  v_count INTEGER;
  v_winner UUID;
  v_max BIGINT;
BEGIN
  PERFORM public.family_awards_assert_admin();

  SELECT e.status
  INTO v_status
  FROM public.family_award_editions e
  WHERE e.id = p_edition_id
  FOR UPDATE;

  IF v_status IS DISTINCT FROM 'closed' THEN
    RAISE EXCEPTION
      'Primero debés cerrar la votación';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.family_award_results r
    JOIN public.family_award_categories c
      ON c.id = r.category_id
    WHERE c.edition_id = p_edition_id
  ) THEN
    RAISE EXCEPTION
      'El recuento ya fue preparado y no se puede recalcular';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.family_award_categories c
    WHERE c.edition_id = p_edition_id
  ) THEN
    RAISE EXCEPTION 'Esta edición no tiene ternas';
  END IF;

  INSERT INTO public.family_award_tallies (
    category_id,
    nominee_id,
    vote_count
  )
  SELECT
    n.category_id,
    n.id,
    count(v.id)::BIGINT
  FROM public.family_award_nominees n
  JOIN public.family_award_categories c
    ON c.id = n.category_id
  LEFT JOIN public.family_award_votes v
    ON v.nominee_id = n.id
   AND v.category_id = n.category_id
  WHERE c.edition_id = p_edition_id
  GROUP BY n.category_id, n.id;

  FOR v_category IN
    SELECT c.id
    FROM public.family_award_categories c
    WHERE c.edition_id = p_edition_id
    ORDER BY c.display_order, c.id
  LOOP
    SELECT max(t.vote_count)
    INTO v_max
    FROM public.family_award_tallies t
    WHERE t.category_id = v_category.id;

    IF v_max IS NULL OR v_max = 0 THEN
      RAISE EXCEPTION
        'Hay una terna sin votos. Revisá la edición antes de preparar la gala';
    END IF;

    SELECT
      count(*)::INTEGER,
      (array_agg(
        t.nominee_id ORDER BY t.nominee_id
      ))[1]
    INTO v_count, v_winner
    FROM public.family_award_tallies t
    WHERE t.category_id = v_category.id
      AND t.vote_count = v_max;

    INSERT INTO public.family_award_results (
      category_id,
      winner_nominee_id,
      is_tie
    )
    VALUES (
      v_category.id,
      CASE
        WHEN v_count = 1 THEN v_winner
        ELSE NULL
      END,
      v_count > 1
    );
  END LOOP;
END;
$$;


-- ==================================================
-- RESOLVER EMPATES
-- Solo puede ganar alguien empatado en primer lugar.
-- ==================================================

CREATE FUNCTION public.admin_ceremony_resolve_tie(
  p_category_id UUID,
  p_nominee_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_edition_id UUID;
BEGIN
  PERFORM public.family_awards_assert_admin();

  SELECT e.id
  INTO v_edition_id
  FROM public.family_award_categories c
  JOIN public.family_award_editions e
    ON e.id = c.edition_id
  WHERE c.id = p_category_id
    AND e.status = 'closed'
  FOR UPDATE OF e;

  IF v_edition_id IS NULL THEN
    RAISE EXCEPTION 'La edición no está cerrada';
  END IF;

  IF char_length(
    btrim(coalesce(p_reason, ''))
  ) NOT BETWEEN 10 AND 300 THEN
    RAISE EXCEPTION
      'Explicá el desempate en 10 a 300 caracteres';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.family_award_results r
    WHERE r.category_id = p_category_id
      AND r.is_tie
      AND r.winner_nominee_id IS NULL
      AND r.revealed_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'Esta terna no tiene un empate pendiente';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.family_award_tallies t
    WHERE t.category_id = p_category_id
      AND t.nominee_id = p_nominee_id
      AND t.vote_count = (
        SELECT max(t2.vote_count)
        FROM public.family_award_tallies t2
        WHERE t2.category_id = p_category_id
      )
  ) THEN
    RAISE EXCEPTION
      'Solo podés elegir entre los nominados empatados';
  END IF;

  UPDATE public.family_award_results r
  SET
    winner_nominee_id = p_nominee_id,
    tie_reason = btrim(p_reason),
    resolved_by = (SELECT auth.uid()),
    resolved_at = clock_timestamp()
  WHERE r.category_id = p_category_id;
END;
$$;


-- ==================================================
-- GUIONES Y VIDEOS
-- Se preparan antes de iniciar la gala.
-- ==================================================

CREATE FUNCTION public.admin_ceremony_set_media(
  p_category_id UUID,
  p_intro TEXT,
  p_winner_text TEXT,
  p_video_path TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_edition_id UUID;
  v_path TEXT :=
    nullif(btrim(coalesce(p_video_path, '')), '');
BEGIN
  PERFORM public.family_awards_assert_admin();

  SELECT e.id
  INTO v_edition_id
  FROM public.family_award_categories c
  JOIN public.family_award_editions e
    ON e.id = c.edition_id
  WHERE c.id = p_category_id
    AND e.status = 'closed'
  FOR UPDATE OF e;

  IF v_edition_id IS NULL THEN
    RAISE EXCEPTION 'La edición debe estar cerrada';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.family_ceremony_sessions s
    WHERE s.edition_id = v_edition_id
  ) THEN
    RAISE EXCEPTION
      'La gala ya comenzó: no se pueden cambiar los medios';
  END IF;

  IF char_length(coalesce(p_intro, '')) > 1200
     OR char_length(
       coalesce(p_winner_text, '')
     ) > 800 THEN
    RAISE EXCEPTION
      'El texto supera el límite permitido';
  END IF;

  IF v_path IS NOT NULL THEN
    IF v_path !~ (
      '^' || v_edition_id::TEXT ||
      '/' || p_category_id::TEXT ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]mp4$'
    ) THEN
      RAISE EXCEPTION 'Ruta de video inválida';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM storage.objects o
      WHERE o.bucket_id = 'family-ceremony-media'
        AND o.name = v_path
    ) THEN
      RAISE EXCEPTION
        'El video todavía no está subido';
    END IF;
  END IF;

  UPDATE public.family_award_results r
  SET
    intro_script = coalesce(p_intro, ''),
    winner_script = coalesce(p_winner_text, ''),
    video_path = v_path
  WHERE r.category_id = p_category_id
    AND r.winner_nominee_id IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Primero prepará y resolvé los resultados';
  END IF;
END;
$$;


-- ==================================================
-- MOTOR DE LA CEREMONIA
-- El administrador controla cada transición.
-- ==================================================

CREATE FUNCTION public.admin_ceremony_control(
  p_edition_id UUID,
  p_command TEXT,
  p_category_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
  v_session public.family_ceremony_sessions%ROWTYPE;
  v_next UUID;
  v_remaining INTEGER;
BEGIN
  PERFORM public.family_awards_assert_admin();

  SELECT e.status
  INTO v_status
  FROM public.family_award_editions e
  WHERE e.id = p_edition_id
  FOR UPDATE;

  IF v_status IS DISTINCT FROM 'closed' THEN
    RAISE EXCEPTION
      'La edición no está lista para la gala';
  END IF;

  IF p_command = 'start' THEN
    IF EXISTS (
      SELECT 1
      FROM public.family_ceremony_sessions s
      WHERE s.edition_id = p_edition_id
    ) THEN
      RAISE EXCEPTION 'La gala ya comenzó';
    END IF;

    SELECT count(*)::INTEGER
    INTO v_remaining
    FROM public.family_award_categories c
    LEFT JOIN public.family_award_results r
      ON r.category_id = c.id
    WHERE c.edition_id = p_edition_id
      AND (
        r.winner_nominee_id IS NULL
        OR r.category_id IS NULL
      );

    IF v_remaining > 0 THEN
      RAISE EXCEPTION
        'Hay resultados sin resolver';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.family_award_results r
      JOIN public.family_award_categories c
        ON c.id = r.category_id
      WHERE c.edition_id = p_edition_id
    ) THEN
      RAISE EXCEPTION
        'Primero prepará el recuento';
    END IF;

    INSERT INTO public.family_ceremony_sessions (
      edition_id
    )
    VALUES (p_edition_id);

    RETURN;
  END IF;

  SELECT *
  INTO v_session
  FROM public.family_ceremony_sessions s
  WHERE s.edition_id = p_edition_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Iniciá la ceremonia primero';
  END IF;

  IF p_command = 'present' THEN
    IF v_session.phase NOT IN (
      'waiting', 'revealed', 'video'
    ) THEN
      RAISE EXCEPTION
        'Debés revelar primero el premio actual';
    END IF;

    SELECT c.id
    INTO v_next
    FROM public.family_award_categories c
    JOIN public.family_award_results r
      ON r.category_id = c.id
    WHERE c.edition_id = p_edition_id
      AND r.revealed_at IS NULL
    ORDER BY c.display_order, c.id
    LIMIT 1;

    IF v_next IS NULL
       OR p_category_id IS DISTINCT FROM v_next
    THEN
      RAISE EXCEPTION
        'Solamente se puede presentar la siguiente terna';
    END IF;

    UPDATE public.family_ceremony_sessions s
    SET
      current_category_id = p_category_id,
      phase = 'nominees',
      updated_at = clock_timestamp()
    WHERE s.edition_id = p_edition_id;

  ELSIF p_command = 'reveal' THEN
    IF v_session.phase <> 'nominees'
       OR v_session.current_category_id IS NULL
    THEN
      RAISE EXCEPTION
        'Primero presentá una terna';
    END IF;

    UPDATE public.family_award_results r
    SET revealed_at = clock_timestamp()
    WHERE r.category_id = v_session.current_category_id
      AND r.winner_nominee_id IS NOT NULL
      AND r.revealed_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'No hay ganador listo para revelar';
    END IF;

    UPDATE public.family_ceremony_sessions s
    SET
      phase = 'revealed',
      updated_at = clock_timestamp()
    WHERE s.edition_id = p_edition_id;

  ELSIF p_command = 'video' THEN
    IF v_session.phase <> 'revealed'
       OR NOT EXISTS (
         SELECT 1
         FROM public.family_award_results r
         WHERE r.category_id =
           v_session.current_category_id
           AND r.video_path IS NOT NULL
       )
    THEN
      RAISE EXCEPTION
        'El video no está disponible';
    END IF;

    UPDATE public.family_ceremony_sessions s
    SET
      phase = 'video',
      updated_at = clock_timestamp()
    WHERE s.edition_id = p_edition_id;

  ELSIF p_command = 'finish' THEN
    IF v_session.phase NOT IN (
      'revealed', 'video'
    ) THEN
      RAISE EXCEPTION
        'Debés revelar el premio actual';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.family_award_results r
      JOIN public.family_award_categories c
        ON c.id = r.category_id
      WHERE c.edition_id = p_edition_id
        AND r.revealed_at IS NULL
    ) THEN
      RAISE EXCEPTION
        'Todavía quedan premios sin revelar';
    END IF;

    UPDATE public.family_ceremony_sessions s
    SET
      phase = 'finished',
      updated_at = clock_timestamp()
    WHERE s.edition_id = p_edition_id;

    UPDATE public.family_award_editions e
    SET status = 'published'
    WHERE e.id = p_edition_id;

  ELSE
    RAISE EXCEPTION 'Comando no permitido';
  END IF;
END;
$$;


-- ==================================================
-- PANEL COMPLETO: SOLO ADMINISTRADORES
-- ==================================================

CREATE FUNCTION public.admin_ceremony_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.family_awards_assert_admin();

  RETURN jsonb_build_object(
    'editions',
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'year', e.year,
          'title', e.title,
          'status', e.status
        )
        ORDER BY e.year DESC
      )
      FROM public.family_award_editions e
      WHERE e.status IN ('closed', 'published')
    ), '[]'::jsonb),

    'categories',
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'edition_id', c.edition_id,
          'title', c.title,
          'display_order', c.display_order
        )
        ORDER BY c.display_order, c.id
      )
      FROM public.family_award_categories c
      JOIN public.family_award_editions e
        ON e.id = c.edition_id
      WHERE e.status IN ('closed', 'published')
    ), '[]'::jsonb),

    'nominees',
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'category_id', n.category_id,
          'title', n.title
        )
      )
      FROM public.family_award_nominees n
      JOIN public.family_award_categories c
        ON c.id = n.category_id
      JOIN public.family_award_editions e
        ON e.id = c.edition_id
      WHERE e.status IN ('closed', 'published')
    ), '[]'::jsonb),

    'tallies',
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'category_id', t.category_id,
          'nominee_id', t.nominee_id,
          'vote_count', t.vote_count
        )
      )
      FROM public.family_award_tallies t
    ), '[]'::jsonb),

    'results',
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'category_id', r.category_id,
          'winner_nominee_id', r.winner_nominee_id,
          'is_tie', r.is_tie,
          'tie_reason', r.tie_reason,
          'revealed_at', r.revealed_at,
          'intro_script', r.intro_script,
          'winner_script', r.winner_script,
          'video_path', r.video_path
        )
      )
      FROM public.family_award_results r
    ), '[]'::jsonb),

    'sessions',
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'edition_id', s.edition_id,
          'current_category_id', s.current_category_id,
          'phase', s.phase
        )
      )
      FROM public.family_ceremony_sessions s
    ), '[]'::jsonb)
  );
END;
$$;


-- ==================================================
-- LISTAR CEREMONIAS PARA FAMILIARES APROBADOS
-- ==================================================

CREATE FUNCTION public.family_ceremony_list()
RETURNS TABLE (
  edition_id UUID,
  edition_title TEXT,
  edition_year INTEGER,
  edition_status TEXT
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
    e.id,
    e.title,
    e.year,
    e.status
  FROM public.family_award_editions e
  JOIN public.family_ceremony_sessions s
    ON s.edition_id = e.id
  WHERE e.status IN ('closed', 'published')
  ORDER BY e.year DESC;
END;
$$;


-- ==================================================
-- ESTADO DE LA PANTALLA
-- Nunca devuelve futuros ganadores.
-- ==================================================

CREATE FUNCTION public.family_ceremony_screen(
  p_edition_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_data JSONB;
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

  SELECT jsonb_build_object(
    'edition_title', e.title,
    'phase', s.phase,

    'category_title',
    CASE
      WHEN s.phase IN ('nominees', 'revealed', 'video')
        THEN c.title
      ELSE NULL
    END,

    'nominees',
    CASE
      WHEN s.phase IN ('nominees', 'revealed', 'video')
      THEN coalesce((
        SELECT jsonb_agg(
          jsonb_build_object(
            'title', n.title,
            'symbol', n.symbol
          )
          ORDER BY n.display_order, n.id
        )
        FROM public.family_award_nominees n
        WHERE n.category_id = c.id
      ), '[]'::jsonb)
      ELSE '[]'::jsonb
    END,

    'intro_script',
    CASE
      WHEN s.phase IN ('nominees', 'revealed', 'video')
        THEN r.intro_script
      ELSE NULL
    END,

    'winner_title',
    CASE
      WHEN s.phase IN ('revealed', 'video')
       AND r.revealed_at IS NOT NULL
        THEN w.title
      ELSE NULL
    END,

    'winner_script',
    CASE
      WHEN s.phase IN ('revealed', 'video')
       AND r.revealed_at IS NOT NULL
        THEN r.winner_script
      ELSE NULL
    END,

    'video_path',
    CASE
      WHEN s.phase = 'video'
       AND r.revealed_at IS NOT NULL
        THEN r.video_path
      ELSE NULL
    END,

    'published_winners',
    CASE
      WHEN e.status = 'published'
      THEN coalesce((
        SELECT jsonb_agg(
          jsonb_build_object(
            'category', c2.title,
            'winner', n2.title
          )
          ORDER BY c2.display_order, c2.id
        )
        FROM public.family_award_categories c2
        JOIN public.family_award_results r2
          ON r2.category_id = c2.id
        JOIN public.family_award_nominees n2
          ON n2.id = r2.winner_nominee_id
        WHERE c2.edition_id = e.id
          AND r2.revealed_at IS NOT NULL
      ), '[]'::jsonb)
      ELSE '[]'::jsonb
    END

  )
  INTO v_data
  FROM public.family_award_editions e
  JOIN public.family_ceremony_sessions s
    ON s.edition_id = e.id
  LEFT JOIN public.family_award_categories c
    ON c.id = s.current_category_id
  LEFT JOIN public.family_award_results r
    ON r.category_id = c.id
  LEFT JOIN public.family_award_nominees w
    ON w.id = r.winner_nominee_id
  WHERE e.id = p_edition_id
    AND e.status IN ('closed', 'published');

  RETURN coalesce(v_data, '{}'::jsonb);
END;
$$;


-- ==================================================
-- HISTORIAL: SOLO EDICIONES PUBLICADAS
-- ==================================================

CREATE FUNCTION public.family_ceremony_archive(
  p_edition_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
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

  SELECT jsonb_build_object(
    'title', e.title,
    'year', e.year,
    'winners',
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'category', c.title,
          'winner', n.title,
          'video_path', r.video_path,
          'message', r.winner_script
        )
        ORDER BY c.display_order, c.id
      )
      FROM public.family_award_categories c
      JOIN public.family_award_results r
        ON r.category_id = c.id
      JOIN public.family_award_nominees n
        ON n.id = r.winner_nominee_id
      WHERE c.edition_id = e.id
        AND r.revealed_at IS NOT NULL
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.family_award_editions e
  WHERE e.id = p_edition_id
    AND e.status = 'published';

  RETURN coalesce(v_result, '{}'::jsonb);
END;
$$;


-- ==================================================
-- BUCKET PRIVADO PARA VIDEOS MP4
-- ==================================================

INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
  'family-ceremony-media',
  'family-ceremony-media',
  FALSE,
  6291456,
  ARRAY['video/mp4']::TEXT[]
)
ON CONFLICT (id)
DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- Verificar si un administrador puede subir video.
CREATE FUNCTION public.can_upload_family_ceremony_video(
  p_path TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.family_award_editions e
      ON e.status = 'closed'
    JOIN public.family_award_categories c
      ON c.edition_id = e.id
    WHERE p.id = (SELECT auth.uid())
      AND p.approval_status = 'approved'
      AND p.role = 'admin'
      AND p_path ~
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]mp4$'
      AND split_part(p_path, '/', 1) = e.id::TEXT
      AND split_part(p_path, '/', 2) = c.id::TEXT
      AND NOT EXISTS (
        SELECT 1
        FROM public.family_ceremony_sessions s
        WHERE s.edition_id = e.id
      )
  );
$$;


-- Familiares solo pueden leer videos revelados
-- durante la ceremonia o publicados en el historial.
CREATE FUNCTION public.can_view_family_ceremony_video(
  p_path TEXT
)
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
      AND (
        p.role = 'admin'
        OR EXISTS (
          SELECT 1
          FROM public.family_award_results r
          JOIN public.family_award_categories c
            ON c.id = r.category_id
          JOIN public.family_award_editions e
            ON e.id = c.edition_id
          WHERE r.video_path = p_path
            AND r.revealed_at IS NOT NULL
            AND (
              e.status = 'published'
              OR EXISTS (
                SELECT 1
                FROM public.family_ceremony_sessions s
                WHERE s.edition_id = e.id
                  AND s.current_category_id = c.id
                  AND s.phase = 'video'
              )
            )
        )
      )
  );
$$;

CREATE POLICY "family_ceremony_media_insert"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'family-ceremony-media'
  AND public.can_upload_family_ceremony_video(name)
);

CREATE POLICY "family_ceremony_media_read"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'family-ceremony-media'
  AND public.can_view_family_ceremony_video(name)
);


-- ==================================================
-- PERMISOS DE LAS FUNCIONES
-- ==================================================

REVOKE ALL ON FUNCTION
public.admin_ceremony_prepare(UUID)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_ceremony_resolve_tie(UUID, UUID, TEXT)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_ceremony_set_media(UUID, TEXT, TEXT, TEXT)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_ceremony_control(UUID, TEXT, UUID)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_ceremony_dashboard()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.family_ceremony_list()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.family_ceremony_screen(UUID)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.family_ceremony_archive(UUID)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.can_upload_family_ceremony_video(TEXT)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.can_view_family_ceremony_video(TEXT)
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE ON FUNCTION
public.admin_ceremony_prepare(UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_ceremony_resolve_tie(UUID, UUID, TEXT)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_ceremony_set_media(UUID, TEXT, TEXT, TEXT)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_ceremony_control(UUID, TEXT, UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_ceremony_dashboard()
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.family_ceremony_list()
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.family_ceremony_screen(UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.family_ceremony_archive(UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.can_upload_family_ceremony_video(TEXT)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.can_view_family_ceremony_video(TEXT)
TO authenticated;

COMMIT;
