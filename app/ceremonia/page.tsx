
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import StageView, {
    RehearsalStage,
} from "@/components/ceremony/StageView";

import CeremonySafetyOverlay from "@/components/ceremony/CeremonySafetyOverlay";

type Props = {
    searchParams: Promise<{
        edicion?: string;
        ensayo?: string;
    }>;
};

type Edition = {
    edition_id: string;
    edition_title: string;
    edition_year: number;
    edition_status: string;
};

// Componente dinámico protegido por Suspense.
async function CeremonyContent({
                                   searchParams,
                               }: Props) {
    const params = await searchParams;

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
            .select("approval_status, role")
            .eq("id", user.id)
            .maybeSingle();

    if (
        profileError ||
        profile?.approval_status !== "approved"
    ) {
        redirect("/pendiente");
    }

    // Modo ensayo exclusivo de administradores.
    if (params.ensayo === "1") {
        if (profile.role !== "admin") {
            notFound();
        }

        return <RehearsalStage />;
    }

    const { data, error } = await supabase.rpc(
        "family_ceremony_list"
    );

    if (error) {
        return (
            <main className="min-h-screen bg-[#09090c] p-10 text-red-300">
                <p role="alert">
                    No se pudieron cargar las ceremonias.
                </p>
            </main>
        );
    }

    const editions = (data ?? []) as Edition[];

    const selected = editions.find(
        (edition) =>
            edition.edition_id === params.edicion
    );

    if (params.edicion && !selected) {
        notFound();
    }

    // Escenario real con sistema de seguridad.
    if (selected) {
        return (
            <>
                <CeremonySafetyOverlay
                    editionId={selected.edition_id}
                />

                <StageView
                    editionId={selected.edition_id}
                />
            </>
        );
    }

    // Selección de ceremonia.
    return (
        <main className="min-h-screen bg-[#09090c] px-6 py-16 text-center text-[#f5e5bd]">
            <h1 className="font-serif text-4xl">
                Ceremonia GoyaAwards
            </h1>

            {editions.length === 0 ? (
                <p className="mt-6">
                    Todavía no hay ceremonias iniciadas.
                </p>
            ) : (
                <div className="mx-auto mt-8 max-w-md space-y-4">
                    {editions.map((edition) => (
                        <Link
                            key={edition.edition_id}
                            href={`/ceremonia?edicion=${edition.edition_id}`}
                            className="block rounded-xl border border-[#d4af37]/40 p-4"
                        >
                            {edition.edition_title} ·{" "}
                            {edition.edition_year}
                        </Link>
                    ))}
                </div>
            )}
        </main>
    );
}

// Página con una vista inicial prerenderizable.
export default function CeremonyPage({
                                         searchParams,
                                     }: Props) {
    return (
        <Suspense
            fallback={
                <main className="flex min-h-screen items-center justify-center bg-[#09090c] px-6 text-[#e6c785]">
                    <p className="text-center">
                        🏆 Preparando GoyaAwards...
                    </p>
                </main>
            }
        >
            <CeremonyContent
                searchParams={searchParams}
            />
        </Suspense>
    );
}
