
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import NomineeCard from "@/components/awards/NomineeCard";

import { awardCategories } from "@/data/demo/award-categories";
import { nomineesByCategory } from "@/data/demo/award-nominees";

interface AwardDetailPageProps {
    params: Promise<{ id: string }>;
}

// Generar las rutas de nuestras categorías ficticias.
export function generateStaticParams() {
    return awardCategories.map((category) => ({
        id: category.id,
    }));
}

// Título personalizado para cada categoría.
export async function generateMetadata({
                                           params,
                                       }: AwardDetailPageProps): Promise<Metadata> {
    const { id } = await params;

    const category = awardCategories.find(
        (item) => item.id === id
    );

    return {
        title: category
            ? `${category.title} | GoyaAwards`
            : "Terna no encontrada | GoyaAwards",
    };
}

export default async function AwardDetailPage({
                                                  params,
                                              }: AwardDetailPageProps) {
    const { id } = await params;

    const category = awardCategories.find(
        (item) => item.id === id
    );

    if (!category) {
        notFound();
    }

    const nominees = nomineesByCategory[id] ?? [];

    return (
        <div className="min-h-screen bg-[#0b0b0d] text-[#f7f3e8]">
            <Navbar />

            <main>
                {/* Encabezado de la categoría */}
                <section className="relative overflow-hidden px-6 py-24 text-center">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.15),transparent_60%)]"
                    />

                    <div className="relative mx-auto max-w-4xl">
                        <Link
                            href="/premios"
                            className="text-sm text-white/50 transition hover:text-[#e6c785]"
                        >
                            ← Volver a los premios
                        </Link>

                        <p className="mt-14 text-xs uppercase tracking-[0.35em] text-[#d4af37]">
                            GoyaAwards 2026 · Categoría {category.number}
                        </p>

                        <h1 className="mt-6 font-serif text-5xl leading-tight sm:text-7xl">
                            {category.title}
                        </h1>

                        <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/60">
                            {category.description}
                        </p>

                        <div className="mx-auto mt-10 h-px w-28 bg-[#d4af37]/60" />
                    </div>
                </section>

                {/* Nominados */}
                <section className="mx-auto max-w-7xl px-6 pb-24">
                    <div className="mb-12 text-center">
                        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
                            Los protagonistas
                        </p>

                        <h2 className="font-serif text-3xl sm:text-4xl">
                            Y los nominados son...
                        </h2>

                        <p className="mt-5 text-white/50">
                            {nominees.length} nominaciones en esta categoría
                        </p>
                    </div>

                    <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
                        {nominees.map((nominee, index) => (
                            <NomineeCard
                                key={nominee.id}
                                nominee={nominee}
                                position={index + 1}
                            />
                        ))}
                    </div>

                    {/* Estado de las votaciones */}
                    <div className="mx-auto mt-20 max-w-2xl rounded-2xl border border-[#d4af37]/25 bg-[#18171b] p-8 text-center">
                        <p
                            aria-hidden="true"
                            className="mb-5 text-4xl"
                        >
                            🏆
                        </p>

                        <h2 className="font-serif text-3xl text-[#e6c785]">
                            La decisión está por llegar
                        </h2>

                        <p className="mt-5 leading-7 text-white/60">
                            Muy pronto podrás votar por tus favoritos
                            y participar en la elección de los ganadores.
                        </p>

                        <p className="mt-7 text-sm text-[#d4af37]">
                            Votaciones próximamente
                        </p>
                    </div>

                    <div className="mt-12 text-center">
                        <Link
                            href="/premios"
                            className="inline-block rounded-full border border-white/25 px-8 py-4 transition hover:border-[#d4af37] hover:text-[#e6c785]"
                        >
                            Explorar otras ternas
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
