
import AwardCard from "@/components/awards/AwardCard";
import { createClient } from "@/lib/supabase/server";
import type { AwardCategory } from "@/data/demo/award-categories";

export default async function AwardsCatalog() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("award_categories")
        .select("slug, title, description, display_order")
        .order("display_order", { ascending: true });

    if (error) {
        return (
            <p role="alert" className="text-center text-red-400">
                No pudimos cargar las categorías.
                Intentá nuevamente más tarde.
            </p>
        );
    }

    const categories: AwardCategory[] = (data ?? []).map(
        (category) => ({
            id: category.slug,
            number: String(category.display_order).padStart(2, "0"),
            title: category.title,
            description: category.description,
        })
    );

    if (categories.length === 0) {
        return (
            <p className="text-center text-white/60">
                Todavía no hay categorías disponibles.
            </p>
        );
    }

    return (
        <>
            <p className="mb-8 text-center text-sm text-[#e6c785]">
                {categories.length} categorías disponibles
            </p>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                    <AwardCard
                        key={category.id}
                        category={category}
                    />
                ))}
            </div>
        </>
    );
}
