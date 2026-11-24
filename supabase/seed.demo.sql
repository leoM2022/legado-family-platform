
-- SOLO PARA LA BASE DE DATOS DEMO

INSERT INTO public.award_editions (year, title)
VALUES (2026, 'GoyaAwards 2026')
ON CONFLICT (year) DO NOTHING;

INSERT INTO public.award_categories
(edition_id, slug, title, description, display_order)
SELECT
    e.id,
    v.slug,
    v.title,
    v.description,
    v.position
FROM public.award_editions e
CROSS JOIN (
    VALUES
    ('momentos', 'Momentos inolvidables',
     'Historias que recordaremos siempre.', 1),

    ('divertidos', 'Los más divertidos',
     'Los momentos que nos hicieron reír.', 2),

    ('especiales', 'Premios especiales',
     'Reconocimientos únicos.', 3)
) AS v(slug, title, description, position)
WHERE e.year = 2026
ON CONFLICT (edition_id, slug) DO NOTHING;

-- Permitir únicamente lectura en la DEMO
GRANT SELECT ON public.award_editions,
public.award_categories TO anon, authenticated;

CREATE POLICY "demo_read_editions"
ON public.award_editions
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "demo_read_categories"
ON public.award_categories
FOR SELECT TO anon, authenticated
USING (true);
