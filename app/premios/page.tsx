
import { Suspense } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AwardsCatalog from "@/components/awards/AwardsCatalog";

export default function AwardsPage() {
    return (
        <div className="min-h-screen bg-[#0b0b0d] text-[#f7f3e8]">
            <Navbar />

            <main className="mx-auto max-w-7xl px-6 py-20">
                <div className="mb-16 text-center">
                    <p className="mb-5 text-xs uppercase tracking-[0.35em] text-[#d4af37]">
                        GoyaAwards · Edición de demostración
                    </p>

                    <h1 className="font-serif text-5xl sm:text-7xl">
                        Las ternas
                    </h1>

                    <p className="mx-auto mt-7 max-w-2xl leading-8 text-white/60">
                        Descubrí las categorías y conocé
                        a los nominados de esta edición.
                    </p>
                </div>

                <section aria-label="Categorías de premios">
                    <Suspense
                        fallback={
                            <p className="text-center text-[#e6c785]">
                                Cargando categorías...
                            </p>
                        }
                    >
                        <AwardsCatalog />
                    </Suspense>
                </section>
            </main>

            <Footer />
        </div>
    );
}
