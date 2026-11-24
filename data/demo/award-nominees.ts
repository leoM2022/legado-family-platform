
export interface Nominee {
    id: string;
    title: string;
    description: string;
    symbol: string;
}

export const nomineesByCategory: Record<string, Nominee[]> = {
    momentos: [
        {
            id: "momento-1",
            title: "La foto del año",
            description:
                "Una fotografía improvisada que terminó siendo inolvidable.",
            symbol: "📸",
        },
        {
            id: "momento-2",
            title: "La gran sorpresa",
            description:
                "Una celebración inesperada que emocionó a todos.",
            symbol: "🎉",
        },
        {
            id: "momento-3",
            title: "La noche mágica",
            description:
                "Una reunión llena de historias y momentos especiales.",
            symbol: "✨",
        },
    ],

    divertidos: [
        {
            id: "divertido-1",
            title: "El baile inesperado",
            description:
                "Una coreografía espontánea que nadie pudo olvidar.",
            symbol: "💃",
        },
        {
            id: "divertido-2",
            title: "La anécdota del año",
            description:
                "Esa historia que siempre consigue hacernos reír.",
            symbol: "😂",
        },
        {
            id: "divertido-3",
            title: "La confusión memorable",
            description:
                "Un pequeño malentendido convertido en leyenda.",
            symbol: "🎭",
        },
    ],

    especiales: [
        {
            id: "especial-1",
            title: "El gran anfitrión",
            description:
                "Un reconocimiento a quien siempre recibe con alegría.",
            symbol: "🏅",
        },
        {
            id: "especial-2",
            title: "Espíritu familiar",
            description:
                "Por mantener vivas las tradiciones compartidas.",
            symbol: "💛",
        },
        {
            id: "especial-3",
            title: "Corazón de oro",
            description:
                "Por los pequeños gestos que hacen grandes diferencias.",
            symbol: "🌟",
        },
    ],
};