
import AwardCard from "@/components/awards/AwardCard";
import { awardCategories } from "@/data/demo/award-categories";

export default function AwardsSection() {
    return (
        <section
            id="premios"
            className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24"
        >
            <div className="mb-12 text-center">
                <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
                    La celebración
                </p>

                <h2 className="font-serif text-4xl sm:text-5xl">
                    Nuestros premios
                </h2>

                <p className="mt-5 text-white/60">
                    Cada categoría representa una parte de nuestra historia.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {awardCategories.map((category) => (
                    <AwardCard
                        key={category.id}
                        category={category}
                    />
                ))}
            </div>
        </section>
    );
}
