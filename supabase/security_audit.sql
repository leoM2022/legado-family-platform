
-- ================================================
-- GOYAAWARDS: AUDITORÍA DE SEGURIDAD
-- Ejecutar manualmente en Supabase SQL Editor.
-- No modifica ningún dato.
-- ================================================


-- 1. Comprobar las tablas privadas.
-- Deben tener RLS habilitado y no permitir
-- lectura directa de votos/resultados.

WITH protected_tables(table_name) AS (
  VALUES
    ('family_award_editions'),
    ('family_award_categories'),
    ('family_award_nominees'),
    ('family_award_votes'),
    ('family_award_tallies'),
    ('family_award_results'),
    ('family_ceremony_sessions')
)
SELECT
  t.table_name,
  to_regclass(
    format('public.%I', t.table_name)
  ) IS NOT NULL AS table_exists,

  c.relrowsecurity AS rls_enabled,

  has_table_privilege(
    'anon',
    to_regclass(format('public.%I', t.table_name)),
    'SELECT'
  ) AS anon_can_read,

  has_table_privilege(
    'authenticated',
    to_regclass(format('public.%I', t.table_name)),
    'SELECT'
  ) AS authenticated_can_read

FROM protected_tables t
LEFT JOIN pg_class c
  ON c.oid = to_regclass(
    format('public.%I', t.table_name)
  )
ORDER BY t.table_name;


-- 2. Comprobar quién puede ejecutar las RPC.
-- Las funciones de administración nunca deben
-- ser ejecutables por el rol anon.

SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid)
    AS arguments,

  p.prosecdef AS security_definer,

  has_function_privilege(
    'anon', p.oid, 'EXECUTE'
  ) AS anon_can_execute,

  has_function_privilege(
    'authenticated', p.oid, 'EXECUTE'
  ) AS authenticated_can_execute

FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    p.proname LIKE 'admin_ceremony_%'
    OR p.proname LIKE 'admin_family_awards_%'
    OR p.proname LIKE 'family_ceremony_%'
    OR p.proname LIKE 'family_awards_%'
  )
ORDER BY p.proname;


-- 3. Detectar cualquier función privilegiada
-- que todavía permita ejecución a anónimos.
-- Revisar cada resultado manualmente.

SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid)
    AS arguments
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = TRUE
  AND has_function_privilege(
    'anon', p.oid, 'EXECUTE'
  )
ORDER BY p.proname;


-- 4. Verificar la privacidad del almacenamiento.
SELECT
  id AS bucket_name,
  public AS is_public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id IN (
  'family-avatars',
  'family-post-images',
  'family-ceremony-media'
)
ORDER BY id;
