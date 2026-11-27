
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import NomineeCard from "@/components/awards/NomineeCard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
    title: "Nominados | Legado",
};

interface AwardDetailProps {
    params: Promise<{ id: string }>;
}

async function AwardDetails({ params }: AwardDetailProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Buscar la edición 2026
    const { data: edition, error: editionError } =
        await supabase
            .from("award_editions")
            .select("id")
            .eq("year", 2026)
            .single();

    if (editionError || !edition) {
        throw new Error("No se pudo cargar la edición.");
    }

    // Buscar la terna por su slug
    const { data: category, error: categoryError } =
        await supabase
            .from("award_categories")
            .select("id, title, description, display_order")
            .eq("edition_id", edition.id)
            .eq("slug", id)
            .maybeSingle();

    if (categoryError) {
        throw new Error("No se pudo cargar la terna.");
    }

    if (!category) {
        notFound();
    }

    // Recuperar los nominados relacionados
    const { data: nominees, error: nomineesError } =
        await supabase
            .from("nominees")
            .select("id, title, description, symbol")
            .eq("category_id", category.id)
            .order("display_order", { ascending: true });

    if (nomineesError) {
        throw new Error("No se pudieron cargar los nominados.");
    }

    return (
        <>
            <section className="px-6 py-24 text-center">
                <div className="mx-auto max-w-4xl">
                    <Link
                        href="/premios"
                        className="text-sm text-white/50 hover:text-[#e6c785]"
                    >
                        ← Volver a los premios
                    </Link>

                    <p className="mt-14 text-xs uppercase tracking-[0.35em] text-[#d4af37]">
                        Legado 2026 · Categoría{" "}
                        {String(category.display_order).padStart(2, "0")}
                    </p>

                    <h1 className="mt-6 font-serif text-5xl sm:text-7xl">
                        {category.title}
                    </h1>

                    <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/60">
                        {category.description}
                    </p>

                    <div className="mx-auto mt-10 h-px w-28 bg-[#d4af37]/60" />
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 pb-24">
                <div className="mb-12 text-center">
                    <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
                        Los protagonistas
                    </p>

                    <h2 className="font-serif text-3xl sm:text-4xl">
                        Y los nominados son...
                    </h2>

                    <p className="mt-5 text-white/50">
                        {nominees?.length ?? 0} nominaciones
                    </p>
                </div>

                {nominees && nominees.length > 0 ? (
                    <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
                        {nominees.map((nominee, index) => (
                            <NomineeCard
                                key={nominee.id}
                                nominee={nominee}
                                position={index + 1}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-white/60">
                        Todavía no hay nominados en esta categoría.
                    </p>
                )}

                <div className="mx-auto mt-20 max-w-2xl rounded-2xl border border-[#d4af37]/25 bg-[#18171b] p-8 text-center">
                    <h2 className="font-serif text-3xl text-[#e6c785]">
                        La decisión está por llegar
                    </h2>

                    <p className="mt-5 leading-7 text-white/60">
                        Próximamente podrás votar por tus favoritos
                        y participar en la elección de los ganadores.
                    </p>
                </div>

                <div className="mt-12 text-center">
                    <Link
                        href="/premios"
                        className="inline-block rounded-full border border-white/25 px-8 py-4 hover:border-[#d4af37] hover:text-[#e6c785]"
                    >
                        Explorar otras ternas
                    </Link>
                </div>
            </section>
        </>
    );
}

export default function AwardDetailPage({
                                            params,
                                        }: AwardDetailProps) {
    return (
        <div className="min-h-screen bg-[#0b0b0d] text-[#f7f3e8]">
            <Navbar />

            <main>
                <Suspense
                    fallback={
                        <p className="py-24 text-center text-[#e6c785]">
                            Cargando nominados...
                        </p>
                    }
                >
                    <AwardDetails params={params} />
                </Suspense>
            </main>

            <Footer demo />
        </div>
    );
}
