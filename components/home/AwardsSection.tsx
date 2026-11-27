import SplitText from "@/components/ui/SplitText";

import AwardCard from "@/components/awards/AwardCard";
import { awardCategories } from "@/data/demo/award-categories";
import Link from "next/link";

export default function AwardsSection() {
    return (
        <section
            id="premios"
            className="mx-auto max-w-7xl scroll-mt-24 px-6 py-14 sm:py-20"
        >
            <header className="gala-editorial-heading">
                <div>
                    <p className="gala-kicker mb-3">Premios GoyaAwards</p>
                    <h2 className="font-serif text-4xl sm:text-6xl"><SplitText text="Las ternas de la gala" /></h2>
                    <p className="mt-3 text-white/70">Categorías de la edición de demostración.</p>
                </div>
                <Link href="/premios" className="gala-button">Explorar todas las ternas</Link>
            </header>

            <div className="gala-reveal grid gap-6 md:grid-cols-3">
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
