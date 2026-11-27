import SubmitButton from "@/components/ui/SubmitButton";
import SplitText from "@/components/ui/SplitText";

import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import { castFamilyVote } from "./actions";

type VotingRow = {
    edition_id: string;
    edition_year: number;
    edition_title: string;
    starts_at: string;
    ends_at: string;

    category_id: string;
    category_title: string;
    category_description: string;

    nominee_id: string;
    nominee_title: string;
    nominee_description: string;
    nominee_symbol: string;

    my_vote_nominee_id: string | null;
};

type VotingNominee = {
    id: string;
    title: string;
    description: string;
    symbol: string;
};

type VotingCategory = {
    id: string;
    title: string;
    description: string;
    myVoteId: string | null;
    nominees: VotingNominee[];
};

type VotingEdition = {
    id: string;
    year: number;
    title: string;
    startsAt: string;
    endsAt: string;
    categories: VotingCategory[];
};

function formatDate(value: string) {
    return new Intl.DateTimeFormat("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Argentina/Jujuy",
    }).format(new Date(value));
}

function organizeVotingRows(
    rows: VotingRow[]
): VotingEdition[] {
    const editions = new Map<string, VotingEdition>();

    for (const row of rows) {
        let edition = editions.get(row.edition_id);

        if (!edition) {
            edition = {
                id: row.edition_id,
                year: row.edition_year,
                title: row.edition_title,
                startsAt: row.starts_at,
                endsAt: row.ends_at,
                categories: [],
            };

            editions.set(row.edition_id, edition);
        }

        let category = edition.categories.find(
            (item) => item.id === row.category_id
        );

        if (!category) {
            category = {
                id: row.category_id,
                title: row.category_title,
                description: row.category_description,
                myVoteId: row.my_vote_nominee_id,
                nominees: [],
            };

            edition.categories.push(category);
        }

        category.nominees.push({
            id: row.nominee_id,
            title: row.nominee_title,
            description: row.nominee_description,
            symbol: row.nominee_symbol,
        });
    }

    return Array.from(editions.values());
}

async function getServerTime(): Promise<number> {
    return Date.now();
}

async function VotingContent() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("approval_status")
            .eq("id", user.id)
            .maybeSingle();

    if (profileError) {
        throw new Error(
            "No se pudo comprobar la aprobación de tu cuenta."
        );
    }

    if (profile?.approval_status !== "approved") {
        redirect("/pendiente");
    }

    const { data, error } = await supabase.rpc(
        "family_awards_voting_catalog"
    );

    if (error) {
        console.error(
            "Error de catálogo de votaciones:",
            error.message
        );

        return (
            <p role="alert" className="text-red-400">
                No se pudieron cargar las votaciones.
            </p>
        );
    }

    const rows = (data ?? []) as VotingRow[];
    const editions = organizeVotingRows(rows);

    if (editions.length === 0) {
        return (
            <div className="gala-panel gala-card p-10 text-center">
                <p className="mb-4 text-4xl">🏆</p>

                <h2 className="font-serif text-2xl text-[#e6c785]">
                    No hay votaciones disponibles
                </h2>

                <p className="mt-4 text-white/60">
                    Cuando se habilite una edición, sus ternas
                    aparecerán en esta página.
                </p>
            </div>
        );
    }

    const now = await getServerTime();

    return (
        <div className="space-y-12">
            {editions.map((edition) => {
                const hasStarted =
                    now >= new Date(edition.startsAt).getTime();

                return (
                    <section
                        key={edition.id}
                        className="space-y-6"
                    >
                        <div className="gala-panel gala-card p-6">
                            <h2 className="font-serif text-3xl text-[#e6c785]">
                                {edition.title}
                            </h2>

                            <p className="mt-3 text-sm text-white/60">
                                Inicio: {formatDate(edition.startsAt)}
                            </p>

                            <p className="mt-1 text-sm text-white/60">
                                Cierre: {formatDate(edition.endsAt)}
                            </p>

                            {!hasStarted && (
                                <p className="mt-4 text-[#e6c785]">
                                    La votación todavía no comenzó.
                                </p>
                            )}
                        </div>

                        {edition.categories.map((category) => {
                            const selectedNominee =
                                category.nominees.find(
                                    (nominee) =>
                                        nominee.id === category.myVoteId
                                );

                            return (
                                <article
                                    key={category.id}
                                    className="gala-panel gala-card p-6"
                                >
                                    <h3 className="font-serif text-2xl text-[#e6c785]">
                                        {category.title}
                                    </h3>

                                    {category.description && (
                                        <p className="mt-3 text-white/60">
                                            {category.description}
                                        </p>
                                    )}

                                    {/* VOTO YA REGISTRADO */}
                                    {category.myVoteId ? (
                                        <div role="status" className="mt-6 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 p-5">
                                            <p className="font-semibold text-[#e6c785]">
                                                ✓ Tu voto está registrado
                                            </p>

                                            <p className="mt-2 text-sm text-white/70">
                                                Elegiste:{" "}
                                                {selectedNominee?.title ??
                                                    "Nominado registrado"}
                                            </p>

                                            <p className="mt-3 text-xs text-white/50">
                                                No es posible cambiar el voto
                                                después de confirmarlo.
                                            </p>
                                        </div>
                                    ) : (
                                        <form
                                            action={castFamilyVote}
                                            className="mt-6 space-y-5"
                                        >
                                            <input
                                                type="hidden"
                                                name="category_id"
                                                value={category.id}
                                            />

                                            <fieldset
                                                disabled={!hasStarted}
                                                className="space-y-3"
                                            >
                                                <legend className="mb-4 font-medium">
                                                    Elegí un nominado
                                                </legend>

                                                {category.nominees.map((nominee) => (
                                                    <label
                                                        key={nominee.id}
                                                        className="gala-ballot flex cursor-pointer items-start gap-4 rounded-xl border border-white/15 p-4 hover:border-[#d4af37]/50"
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="nominee_id"
                                                            value={nominee.id}
                                                            required
                                                            className="mt-1 accent-[#d4af37]"
                                                        />

                                                        <span>
                              <span className="block font-semibold text-[#e6c785]">
                                {nominee.symbol}{" "}
                                  {nominee.title}
                              </span>

                                                            {nominee.description && (
                                                                <span className="mt-2 block text-sm text-white/60">
                                  {nominee.description}
                                </span>
                                                            )}
                            </span>
                                                    </label>
                                                ))}
                                            </fieldset>

                                            <p className="text-xs text-white/50">
                                                Tu elección será definitiva.
                                                Podés votar una sola vez en esta terna.
                                            </p>

                                            <SubmitButton
                                                pendingLabel="Registrando voto…"
                                                disabled={!hasStarted}
                                                className="gala-button gala-button--gold w-full sm:w-auto"
                                            >
                                                Confirmar mi voto
                                            </SubmitButton>
                                        </form>
                                    )}
                                </article>
                            );
                        })}
                    </section>
                );
            })}
        </div>
    );
}

export default function VotingPage() {
    return (
        <div className="gala-room">
            <Navbar />

            <main className="mx-auto max-w-6xl px-6 py-16">
                <Link
                    href="/mi-espacio"
                    className="text-sm text-white/60"
                >
                    ← Volver a mi espacio
                </Link>

                <header className="gala-page-header mt-10">
                    <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
                        GoyaAwards · Premiaciones familiares
                    </p>

                    <h1 className="font-serif text-5xl text-[#e6c785]"><SplitText text="Tu voto cuenta" /></h1>

                    <p className="mt-5 text-white/60">
                        Elegí a tus nominados favoritos.
                        Cada terna admite un voto por familiar.
                    </p>
                </header>

                <Suspense
                    fallback={
                        <p className="text-center text-[#e6c785]">
                            Cargando votaciones...
                        </p>
                    }
                >
                    <VotingContent />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
