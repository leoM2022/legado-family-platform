
import Link from "next/link";

import {
    notFound,
    redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import StageView, {
    RehearsalStage,
} from "@/components/ceremony/StageView";

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

export default async function CeremonyPage({
                                               searchParams,
                                           }: Props) {
    const params = await searchParams;

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

    if (profile?.approval_status !== "approved") {
        redirect("/pendiente");
    }

    // Ensayo exclusivo de administradores.
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
            <p role="alert">
                No se pudieron cargar las ceremonias.
            </p>
        );
    }

    const editions = (data ?? []) as Edition[];

    const selected = editions.find(
        (e) =>
            e.edition_id === params.edicion
    );

    if (params.edicion && !selected) {
        notFound();
    }

    if (selected) {
        return (
            <StageView editionId={selected.edition_id} />
        );
    }

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
                    {editions.map((e) => (
                        <Link
                            key={e.edition_id}
                            href={`/ceremonia?edicion=${e.edition_id}`}
                            className="block rounded-xl border border-[#d4af37]/40 p-4"
                        >
                            {e.edition_title} · {e.edition_year}
                        </Link>
                    ))}
                </div>
            )}
        </main>
    );
}
