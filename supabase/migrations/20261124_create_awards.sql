
-- Tabla de ediciones
CREATE TABLE IF NOT EXISTS public.award_editions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL
);

-- Tabla de ternas
CREATE TABLE IF NOT EXISTS public.award_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_id UUID NOT NULL
        REFERENCES public.award_editions(id)
        ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,

    UNIQUE (edition_id, slug)
);

-- Activar seguridad por filas
ALTER TABLE public.award_editions
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.award_categories
ENABLE ROW LEVEL SECURITY;

-- Sin acceso directo hasta definir políticas
REVOKE ALL ON public.award_editions
FROM anon, authenticated;

REVOKE ALL ON public.award_categories
FROM anon, authenticated;
