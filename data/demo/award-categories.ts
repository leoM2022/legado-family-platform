
export interface AwardCategory {
    id: string;
    number: string;
    title: string;
    description: string;
}

export const awardCategories: AwardCategory[] = [
    {
        id: "momentos",
        number: "01",
        title: "Momentos inolvidables",
        description:
            "Las historias que seguiremos contando durante años.",
    },
    {
        id: "divertidos",
        number: "02",
        title: "Los más divertidos",
        description:
            "Porque las mejores reuniones tienen muchas risas.",
    },
    {
        id: "especiales",
        number: "03",
        title: "Premios especiales",
        description:
            "Un reconocimiento para quienes hacen única a la familia.",
    },
];
