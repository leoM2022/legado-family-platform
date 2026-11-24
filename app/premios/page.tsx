
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AwardCard from "@/components/awards/AwardCard";
import { awardCategories } from "@/data/demo/award-categories";

export default function AwardsPage() {
    return (
        <div className="min-h-screen bg-[#0b0b0d] text-[#f7f3e8]">
            <Navbar />

            <main className="mx-auto max-w-7xl px-6 py-20">
                {/* Encabezado */}
                <div className="mb-16 text-center">
                    <p className="mb-5 text-xs uppercase tracking-[0.35em] text-[#d4af37]">
                        GoyaAwards · Edición de demostración
                    </p>

                    <h1 className="font-serif text-5xl sm:text-7xl">
                        Las ternas
                    </h1>

                    <p className="mx-auto mt-7 max-w-2xl leading-8 text-white/60">
                        Cada premio representa un recuerdo,
                        una historia o un momento especial.
                        Descubrí todas las categorías de esta edición.
                    </p>
                </div>

                {/* Información de la edición */}
                <div className="mb-12 flex flex-wrap items-center justify-between gap-4 border-y border-[#d4af37]/20 py-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-white/40">
                            Edición
                        </p>
                        <p className="mt-2 font-serif text-2xl text-[#e6c785]">
                            2026
                        </p>
                    </div>

                    <div className="text-right">
                        <p className="text-xs uppercase tracking-widest text-white/40">
                            Categorías disponibles
                        </p>
                        <p className="mt-2 font-serif text-2xl text-[#e6c785]">
                            {awardCategories.length}
                        </p>
                    </div>
                </div>

                {/* Catálogo */}
                <section aria-label="Categorías de premios">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {awardCategories.map((category) => (
                            <AwardCard
                                key={category.id}
                                category={category}
                            />
                        ))}
                    </div>
                </section>

                {/* Aviso de demostración */}
                <div className="mt-20 rounded-2xl border border-[#d4af37]/20 bg-[#18171b] p-8 text-center">
                    <h2 className="font-serif text-2xl text-[#e6c785]">
                        Una celebración para recordar
                    </h2>

                    <p className="mx-auto mt-4 max-w-xl leading-7 text-white/60">
                        Próximamente podrás explorar los nominados
                        de cada categoría y participar en las votaciones.
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
