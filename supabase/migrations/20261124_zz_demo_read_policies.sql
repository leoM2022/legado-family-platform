
-- Políticas exclusivas de goyaawards-demo
-- No aplicar en la base familiar privada

GRANT USAGE ON SCHEMA public
TO anon, authenticated;

GRANT SELECT ON
    public.award_editions,
    public.award_categories,
    public.nominees
TO anon, authenticated;

ALTER TABLE public.award_editions
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.award_categories
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nominees
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_read_editions"
ON public.award_editions;

CREATE POLICY "demo_read_editions"
ON public.award_editions
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "demo_read_categories"
ON public.award_categories;

CREATE POLICY "demo_read_categories"
ON public.award_categories
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "demo_read_nominees"
ON public.nominees;

CREATE POLICY "demo_read_nominees"
ON public.nominees
FOR SELECT TO anon, authenticated
USING (true);
