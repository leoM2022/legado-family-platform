import SubmitButton from "@/components/ui/SubmitButton";
import SplitText from "@/components/ui/SplitText";
import CeremonyPauseControl from "@/components/ceremony/CeremonyPauseControl";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import CeremonyMediaForm from "@/components/ceremony/CeremonyMediaForm";

import {
    prepareCeremony,
    resolveCeremonyTie,
    controlCeremony,
} from "./actions";

type Edition = {
    id: string;
    year: number;
    title: string;
    status: string;
};

type Category = {
    id: string;
    edition_id: string;
    title: string;
    display_order: number;
};

type Nominee = {
    id: string;
    category_id: string;
    title: string;
};

type Tally = {
    category_id: string;
    nominee_id: string;
    vote_count: number;
};

type Result = {
    category_id: string;
    winner_nominee_id: string | null;
    is_tie: boolean;
    tie_reason: string | null;
    revealed_at: string | null;
    intro_script: string;
    winner_script: string;
    video_path: string | null;
};

type Session = {
    edition_id: string;
    current_category_id: string | null;
    phase: string;
};

type Dashboard = {
    editions: Edition[];
    categories: Category[];
    nominees: Nominee[];
    tallies: Tally[];
    results: Result[];
    sessions: Session[];
};

function ControlButton({
                           editionId,
                           command,
                           categoryId,
                           children,
                       }: {
    editionId: string;
    command: string;
    categoryId?: string;
    children: ReactNode;
}) {
    return (
        <form action={controlCeremony}>
            <input
                type="hidden"
                name="edition_id"
                value={editionId}
            />

            <input
                type="hidden"
                name="category_id"
                value={categoryId ?? ""}
            />

            <input
                type="hidden"
                name="command"
                value={command}
            />

            <SubmitButton
                pendingLabel="Actualizando escenario…"
                data-command={command}
                className="gala-button gala-command"
            >
                {children}
            </SubmitButton>
        </form>
    );
}

async function AdminContent() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status, role")
        .eq("id", user.id)
        .maybeSingle();

    if (
        profile?.approval_status !== "approved" ||
        profile.role !== "admin"
    ) {
        notFound();
    }

    const { data, error } = await supabase.rpc(
        "admin_ceremony_dashboard"
    );

    if (error) {
        return (
            <p role="alert">
                No se pudo abrir la consola: {error.message}
            </p>
        );
    }

    const dashboard = (data ?? {}) as Dashboard;

    const editions = dashboard.editions ?? [];
    const categories = dashboard.categories ?? [];
    const nominees = dashboard.nominees ?? [];
    const tallies = dashboard.tallies ?? [];
    const results = dashboard.results ?? [];
    const sessions = dashboard.sessions ?? [];

    return (
        <div className="space-y-10">
            {editions.length === 0 && (
                <p>
                    No hay ediciones cerradas. Cerrá primero la
                    votación desde{" "}
                    <Link
                        href="/admin/votaciones"
                        className="underline"
                    >
                        Control de votos
                    </Link>.
                </p>
            )}

            {editions.map((edition) => {
                const cats = categories.filter(
                    (c) => c.edition_id === edition.id
                );

                const session = sessions.find(
                    (s) => s.edition_id === edition.id
                );

                const prepared =
                    cats.length > 0 &&
                    cats.every((c) =>
                        results.some(
                            (r) => r.category_id === c.id
                        )
                    );

                const unresolved = cats.filter(
                    (c) =>
                        !results.find(
                            (r) => r.category_id === c.id
                        )?.winner_nominee_id
                );

                const next = cats.find(
                    (c) =>
                        !results.find(
                            (r) => r.category_id === c.id
                        )?.revealed_at
                );

                const active = cats.find(
                    (c) =>
                        c.id === session?.current_category_id
                );

                const activeResult = results.find(
                    (r) => r.category_id === active?.id
                );

                const revealedAll =
                    prepared &&
                    cats.every(
                        (c) =>
                            results.find(
                                (r) => r.category_id === c.id
                            )?.revealed_at
                    );

                return (
                    <section
                        key={edition.id}
                        className="gala-panel gala-console-edition p-5 sm:p-7"
                    >
                        <h2 className="font-serif text-3xl text-[#e6c785]">
                            {edition.title}
                        </h2>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="gala-status-chip text-sm">Edición · {edition.status}</span>
                            <span className="gala-status-chip text-sm">Escenario · {session?.phase ?? "sin iniciar"}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                            {session && (
                                <Link
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href={`/ceremonia?edicion=${edition.id}`}
                                    className="rounded-full bg-[#d4af37] px-5 py-2 text-sm font-semibold text-black"
                                >
                                    Abrir escenario
                                </Link>
                            )}

                            <Link
                                target="_blank"
                                rel="noopener noreferrer"
                                href="/ceremonia?ensayo=1"
                                className="rounded-full border border-white/20 px-5 py-2 text-sm"
                            >
                                Modo ensayo
                            </Link>
                        </div>

                        {/* PREPARAR RESULTADOS */}

                        {edition.status === "closed" &&
                            !prepared && (
                                <form
                                    action={prepareCeremony}
                                    className="gala-live-desk mt-6 space-y-3"
                                >
                                    <input
                                        type="hidden"
                                        name="edition_id"
                                        value={edition.id}
                                    />

                                    <h3 className="gala-kicker">Preparación de resultados</h3>
                                    <p className="text-sm text-white/70">
                                        Congelar el recuento de votos.
                                        Es una operación definitiva.
                                    </p>

                                    <SubmitButton
                                        pendingLabel="Preparando resultados…"
                                        className="gala-button gala-button--gold"
                                    >
                                        Preparar resultados definitivos
                                    </SubmitButton>
                                </form>
                            )}

                        {/* INICIAR LA GALA */}

                        {prepared &&
                            !session &&
                            unresolved.length === 0 &&
                            edition.status === "closed" && (
                                <div className="gala-live-desk mt-6">
                                    <h3 className="gala-kicker mb-3">Inicio de la gala</h3>
                                    <ControlButton
                                        editionId={edition.id}
                                        command="start"
                                    >
                                        Iniciar ceremonia real
                                    </ControlButton>
                                </div>
                            )}

                        {/* CONTROLES DURANTE LA GALA */}

                        {session &&
                            edition.status === "closed" && (
                                <div className="gala-live-desk mt-6">
                                    <h3 className="gala-kicker mb-4">Conducción en vivo</h3>
                                    <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
                                        <div className="space-y-3">
                                            {next &&
                                                [
                                                    "waiting",
                                                    "revealed",
                                                    "video",
                                                ].includes(session.phase) && (
                                                    <ControlButton
                                                        editionId={edition.id}
                                                        command="present"
                                                        categoryId={next.id}
                                                    >
                                                        Presentar siguiente terna:{" "}
                                                        {next.title}
                                                    </ControlButton>
                                                )}

                                            {session.phase === "nominees" &&
                                                active && (
                                                    <ControlButton
                                                        editionId={edition.id}
                                                        command="reveal"
                                                    >
                                                        Abrir sobre: {active.title}
                                                    </ControlButton>
                                                )}

                                            {session.phase === "revealed" &&
                                                activeResult?.video_path && (
                                                    <ControlButton
                                                        editionId={edition.id}
                                                        command="video"
                                                    >
                                                        Reproducir video del ganador
                                                    </ControlButton>
                                                )}

                                            {revealedAll &&
                                                [
                                                    "revealed",
                                                    "video",
                                                ].includes(session.phase) && (
                                                    <ControlButton
                                                        editionId={edition.id}
                                                        command="finish"
                                                    >
                                                        Finalizar gala y publicar historial
                                                    </ControlButton>
                                                )}
                                        </div>
                                        <CeremonyPauseControl editionId={edition.id} />
                                    </div>
                                </div>
                            )}

                        {/* LISTA DE TERNAS */}

                        <h3 className="mt-8 font-serif text-xl text-[#e6c785]">
                            Ternas y resultados
                        </h3>

                        <div className="mt-4 space-y-5">
                            {cats.map((category) => {
                                const result = results.find(
                                    (r) =>
                                        r.category_id === category.id
                                );

                                const votes = tallies.filter(
                                    (t) =>
                                        t.category_id === category.id
                                );

                                const maxVotes = Math.max(
                                    0,
                                    ...votes.map(
                                        (t) => t.vote_count
                                    )
                                );

                                const categoryNominees =
                                    nominees.filter(
                                        (n) =>
                                            n.category_id === category.id
                                    );

                                const winner = categoryNominees.find(
                                    (n) =>
                                        n.id ===
                                        result?.winner_nominee_id
                                );

                                const canEditMedia =
                                    edition.status === "closed" &&
                                    !session &&
                                    !!winner;

                                return (
                                    <details
                                        key={category.id}
                                        className="rounded-xl border border-white/15 bg-black/20 p-4"
                                    >
                                        <summary className="cursor-pointer font-semibold">
                                            {category.title}
                                            {" — "}
                                            {result
                                                ? winner
                                                    ? `Ganador: ${winner.title}`
                                                    : "Empate pendiente"
                                                : "Sin preparar"}
                                        </summary>

                                        <div className="mt-4 space-y-2 text-sm text-white/70">
                                            {categoryNominees.map(
                                                (nominee) => (
                                                    <p key={nominee.id}>
                                                        {nominee.title}:{" "}
                                                        {votes.find(
                                                            (v) =>
                                                                v.nominee_id ===
                                                                nominee.id
                                                        )?.vote_count ?? "—"}{" "}
                                                        votos
                                                    </p>
                                                )
                                            )}
                                        </div>

                                        {/* DESEMPATES */}

                                        {result?.is_tie &&
                                            !winner &&
                                            edition.status === "closed" &&
                                            !session && (
                                                <form
                                                    action={resolveCeremonyTie}
                                                    className="gala-live-desk mt-5 space-y-3"
                                                >
                                                    <input
                                                        type="hidden"
                                                        name="category_id"
                                                        value={category.id}
                                                    />

                                                    <h4 className="gala-kicker">Desempate</h4>
                                                    <p className="text-sm">
                                                        Elegí entre los nominados
                                                        empatados con {maxVotes} votos:
                                                    </p>

                                                    {categoryNominees
                                                        .filter((n) =>
                                                            votes.some(
                                                                (v) =>
                                                                    v.nominee_id === n.id &&
                                                                    v.vote_count === maxVotes
                                                            )
                                                        )
                                                        .map((n) => (
                                                            <label
                                                                key={n.id}
                                                                className="block text-sm"
                                                            >
                                                                <input
                                                                    required
                                                                    type="radio"
                                                                    name="nominee_id"
                                                                    value={n.id}
                                                                />{" "}
                                                                {n.title}
                                                            </label>
                                                        ))}

                                                    <textarea
                                                        required
                                                        name="reason"
                                                        minLength={10}
                                                        maxLength={300}
                                                        rows={3}
                                                        placeholder="Motivo del desempate"
                                                        className="w-full rounded-lg bg-black/30 p-3"
                                                    />

                                                    <SubmitButton
                                                        pendingLabel="Guardando desempate…"
                                                        className="gala-button gala-button--gold"
                                                    >
                                                        Resolver empate
                                                    </SubmitButton>
                                                </form>
                                            )}

                                        {result?.tie_reason && (
                                            <p className="mt-3 text-xs text-white/50">
                                                Desempate: {result.tie_reason}
                                            </p>
                                        )}

                                        {/* GUIONES Y VIDEO */}

                                        {canEditMedia && (
                                            <CeremonyMediaForm
                                                editionId={edition.id}
                                                categoryId={category.id}
                                                intro={
                                                    result?.intro_script ?? ""
                                                }
                                                winner={
                                                    result?.winner_script ?? ""
                                                }
                                                currentPath={
                                                    result?.video_path ?? null
                                                }
                                            />
                                        )}
                                    </details>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

export default function CeremonyAdminPage() {
    return (
        <div className="gala-room">
            <Navbar />

            <main className="mx-auto max-w-6xl px-6 py-12">
                <Link
                    href="/admin/votaciones"
                    className="text-sm text-white/60"
                >
                    ← Volver a votaciones
                </Link>

                <h1 className="my-8 font-serif text-[#f6e6ca]"><SplitText text="Consola del presentador" /></h1>

                <p className="mb-8 text-white/60">
                    Prepará resultados, desempates, guiones y
                    videos. El escenario no revela nada hasta
                    que vos lo ordenes.
                </p>

                <Suspense
                    fallback={
                        <p>Cargando consola...</p>
                    }
                >
                    <AdminContent />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
