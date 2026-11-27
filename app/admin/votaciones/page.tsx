
import { Suspense } from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";

import {
    saveVotingSchedule,
    openFamilyVoting,
    closeFamilyVoting,
} from "./actions";

type VotingEdition = {
    edition_id: string;
    edition_year: number;
    edition_title: string;
    edition_status: "draft" | "voting" | "closed" | "published";
    starts_at: string | null;
    ends_at: string | null;
    category_count: number;
    nominee_count: number;
    incomplete_categories: number;
};

const inputClass =
    "w-full rounded-xl border border-white/20 bg-[#0b0b0d] p-3 text-white";

function formatDate(value: string | null) {
    if (!value) return "Sin configurar";

    return new Intl.DateTimeFormat("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Argentina/Jujuy",
    }).format(new Date(value));
}

function toDateTimeLocal(value: string | null) {
    if (!value) return "";

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Argentina/Jujuy",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(value));

    const get = (part: string) =>
        parts.find((item) => item.type === part)?.value ?? "";

    return (
        `${get("year")}-${get("month")}-${get("day")}` +
        `T${get("hour")}:${get("minute")}`
    );
}

function statusLabel(edition: VotingEdition) {
    if (edition.edition_status === "draft") {
        return "Borrador";
    }

    if (edition.edition_status === "closed") {
        return "Votación cerrada";
    }

    if (edition.edition_status === "published") {
        return "Resultados publicados";
    }

    const now = Date.now();

    if (
        edition.starts_at &&
        now < new Date(edition.starts_at).getTime()
    ) {
        return "Habilitada — esperando fecha de inicio";
    }

    if (
        edition.ends_at &&
        now >= new Date(edition.ends_at).getTime()
    ) {
        return "Plazo finalizado — pendiente de cierre";
    }

    return "Votación en curso";
}

async function VotingAdminContent() {
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
            .select("role, approval_status")
            .eq("id", user.id)
            .maybeSingle();

    if (
        profileError ||
        profile?.role !== "admin" ||
        profile.approval_status !== "approved"
    ) {
        notFound();
    }

    const { data, error } = await supabase.rpc(
        "admin_family_awards_voting_overview"
    );

    if (error) {
        console.error(
            "Error del panel de votaciones:",
            error.message
        );

        return (
            <p role="alert" className="text-red-400">
                No se pudieron cargar las ediciones.
            </p>
        );
    }

    const editions =
        (data ?? []) as VotingEdition[];

    return (
        <div className="space-y-6">
            {editions.length === 0 && (
                <div className="rounded-2xl border border-white/10 p-6">
                    <p className="mb-4 text-white/60">
                        Todavía no existen ediciones familiares.
                    </p>

                    <Link
                        href="/admin/premios"
                        className="text-[#e6c785] underline"
                    >
                        Crear una edición
                    </Link>
                </div>
            )}

            {editions.map((edition) => (
                <section
                    key={edition.edition_id}
                    className="rounded-2xl border border-[#d4af37]/20 bg-[#18171b] p-6"
                >
                    <h2 className="font-serif text-2xl text-[#e6c785]">
                        {edition.edition_title}
                    </h2>

                    <p className="mt-2 text-sm text-white/60">
                        Año {edition.edition_year} · {statusLabel(edition)}
                    </p>

                    <div className="mt-5 space-y-1 text-sm text-white/60">
                        <p>
                            Categorías: {edition.category_count}
                        </p>
                        <p>
                            Nominados: {edition.nominee_count}
                        </p>
                        <p>
                            Categorías con menos de dos nominados:{" "}
                            {edition.incomplete_categories}
                        </p>
                        <p>
                            Inicio: {formatDate(edition.starts_at)}
                        </p>
                        <p>
                            Cierre: {formatDate(edition.ends_at)}
                        </p>
                    </div>

                    {/* EDICIÓN EN BORRADOR */}
                    {edition.edition_status === "draft" && (
                        <div className="mt-7 space-y-6 border-t border-white/10 pt-6">
                            <form
                                action={saveVotingSchedule}
                                className="space-y-4"
                            >
                                <input
                                    type="hidden"
                                    name="edition_id"
                                    value={edition.edition_id}
                                />

                                <h3 className="font-semibold">
                                    Configurar período de votación
                                </h3>

                                <p className="text-xs text-white/50">
                                    Las fechas se ingresan en horario de Jujuy.
                                </p>

                                <div>
                                    <label
                                        htmlFor={`start-${edition.edition_id}`}
                                        className="mb-2 block text-sm"
                                    >
                                        Fecha y hora de inicio
                                    </label>

                                    <input
                                        id={`start-${edition.edition_id}`}
                                        name="starts_at"
                                        type="datetime-local"
                                        required
                                        defaultValue={toDateTimeLocal(
                                            edition.starts_at
                                        )}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor={`end-${edition.edition_id}`}
                                        className="mb-2 block text-sm"
                                    >
                                        Fecha y hora de cierre
                                    </label>

                                    <input
                                        id={`end-${edition.edition_id}`}
                                        name="ends_at"
                                        type="datetime-local"
                                        required
                                        defaultValue={toDateTimeLocal(
                                            edition.ends_at
                                        )}
                                        className={inputClass}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="rounded-full border border-[#d4af37] px-5 py-3 text-sm text-[#e6c785]"
                                >
                                    Guardar fechas
                                </button>
                            </form>

                            <form action={openFamilyVoting}>
                                <input
                                    type="hidden"
                                    name="edition_id"
                                    value={edition.edition_id}
                                />

                                <button
                                    type="submit"
                                    disabled={
                                        !edition.starts_at ||
                                        !edition.ends_at ||
                                        edition.category_count === 0 ||
                                        edition.incomplete_categories > 0
                                    }
                                    className="rounded-full bg-[#d4af37] px-6 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Habilitar votación
                                </button>

                                <p className="mt-3 text-xs text-white/50">
                                    Una vez habilitada, no se podrán editar
                                    las ternas ni sus nominados. Los votos
                                    empezarán a aceptarse en la fecha indicada.
                                </p>
                            </form>
                        </div>
                    )}

                    {/* EDICIÓN HABILITADA */}
                    {edition.edition_status === "voting" && (
                        <div className="mt-7 border-t border-white/10 pt-6">
                            <form action={closeFamilyVoting}>
                                <input
                                    type="hidden"
                                    name="edition_id"
                                    value={edition.edition_id}
                                />

                                <button
                                    type="submit"
                                    className="rounded-full border border-red-400/60 px-6 py-3 text-sm text-red-300"
                                >
                                    Cerrar votación
                                </button>
                            </form>

                            <p className="mt-3 text-xs text-white/50">
                                El cierre manual es definitivo y detiene
                                inmediatamente la recepción de votos.
                            </p>
                        </div>
                    )}

                    {edition.edition_status === "closed" && (
                        <p className="mt-6 text-sm text-[#e6c785]">
                            Los votos están protegidos. En la próxima
                            etapa incorporaremos los resultados.
                        </p>
                    )}
                </section>
            ))}
        </div>
    );
}

export default function AdminVotingPage() {
    return (
        <div className="min-h-screen bg-[#0b0b0d] text-white">
            <Navbar />

            <main className="mx-auto max-w-4xl px-6 py-16">
                <Link
                    href="/admin/premios"
                    className="text-sm text-white/60"
                >
                    ← Volver a gestionar ternas
                </Link>

                <header className="mb-12 mt-10">
                    <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
                        Legado · Administración
                    </p>

                    <h1 className="font-serif text-4xl text-[#e6c785]">
                        Control de votaciones
                    </h1>

                    <p className="mt-4 text-white/60">
                        Configurá las fechas, habilitá las
                        votaciones y cerrá cada edición.
                    </p>
                </header>

                <Suspense
                    fallback={
                        <p className="text-[#e6c785]">
                            Cargando votaciones...
                        </p>
                    }
                >
                    <VotingAdminContent />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
