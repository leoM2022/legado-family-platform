
-- Tabla de nominados
CREATE TABLE IF NOT EXISTS public.nominees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category_id UUID NOT NULL
        REFERENCES public.award_categories(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    symbol TEXT NOT NULL DEFAULT '🏆',
    display_order INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT nominee_title_not_empty
        CHECK (length(trim(title)) > 0),

    UNIQUE (category_id, title)
);

-- Seguridad
ALTER TABLE public.nominees
ENABLE ROW LEVEL SECURITY;

-- En esta DEMO solo permitimos lectura
REVOKE ALL ON public.nominees
FROM anon, authenticated;

GRANT SELECT ON public.nominees
TO anon, authenticated;

CREATE POLICY "demo_read_nominees"
ON public.nominees
FOR SELECT
TO anon, authenticated
USING (true);
