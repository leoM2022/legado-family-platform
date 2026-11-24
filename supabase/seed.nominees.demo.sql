
-- Datos ficticios para goyaawards-demo

INSERT INTO public.nominees
(category_id, title, description, symbol, display_order)

SELECT
    c.id,
    v.title,
    v.description,
    v.symbol,
    v.position

FROM public.award_categories c

JOIN public.award_editions e
    ON e.id = c.edition_id

JOIN (
    VALUES
    ('momentos', 'La foto del año',
     'Una fotografía inolvidable.', '📸', 1),

    ('momentos', 'La gran sorpresa',
     'Una celebración inesperada.', '🎉', 2),

    ('momentos', 'La noche mágica',
     'Una noche llena de recuerdos.', '✨', 3),

    ('divertidos', 'El baile inesperado',
     'El baile que sorprendió a todos.', '💃', 1),

    ('divertidos', 'La anécdota del año',
     'Una historia muy divertida.', '😂', 2),

    ('divertidos', 'La confusión memorable',
     'Un malentendido inolvidable.', '🎭', 3),

    ('especiales', 'El gran anfitrión',
     'Siempre recibe con alegría.', '🏅', 1),

    ('especiales', 'Espíritu familiar',
     'Mantiene nuestras tradiciones.', '💛', 2),

    ('especiales', 'Corazón de oro',
     'Un reconocimiento especial.', '🌟', 3)

) AS v(slug, title, description, symbol, position)
    ON v.slug = c.slug

WHERE e.year = 2026

ON CONFLICT (category_id, title) DO NOTHING;
