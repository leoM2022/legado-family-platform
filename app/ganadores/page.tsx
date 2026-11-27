import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Suspense } from "react";

type Winner = {
    category: string;
    winner: string;
    message: string;
    video_path: string | null;
};

type Archive = {
    title: string;
    year: number;
    winners: Winner[];
};

type Edition = {
    edition_id: string;
    edition_status: string;
};

async function WinnersContent() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("id", user.id)
        .maybeSingle();

    if (profile?.approval_status !== "approved") {
        redirect("/pendiente");
    }

    const { data, error } = await supabase.rpc(
        "family_ceremony_list"
    );

    if (error) {
        return (
            <p role="alert">
                No se pudo cargar el historial.
            </p>
        );
    }

    const published = (
        (data ?? []) as Edition[]
    ).filter(
        (e) => e.edition_status === "published"
    );

    const archives = await Promise.all(
        published.map(async (e) => {
            const {
                data: item,
                error: itemError,
            } = await supabase.rpc(
                "family_ceremony_archive",
                {
                    p_edition_id: e.edition_id,
                }
            );

            if (itemError) return null;

            const archive = item as Archive;

            const winners = await Promise.all(
                (archive.winners ?? []).map(
                    async (winner) => {
                        if (!winner.video_path) {
                            return {
                                ...winner,
                                signedUrl: null as string | null,
                            };
                        }

                        const { data: video } =
                            await supabase.storage
                                .from("family-ceremony-media")
                                .createSignedUrl(
                                    winner.video_path,
                                    300
                                );

                        return {
                            ...winner,
                            signedUrl:
                                video?.signedUrl ?? null,
                        };
                    }
                )
            );

            return {
                id: e.edition_id,
                title: archive.title,
                winners,
            };
        })
    );

    return (
        <div className="min-h-screen bg-[#0b0b0d] text-white">
            <Navbar />

            <main className="mx-auto max-w-5xl px-6 py-16">
                <Link
                    href="/mi-espacio"
                    className="text-sm text-white/50"
                >
                    ← Volver
                </Link>

                <h1 className="my-10 font-serif text-4xl text-[#e6c785]">
                    Historial de GoyaAwards
                </h1>

                {published.length === 0 && (
                    <p>
                        Todavía no hay ceremonias publicadas.
                    </p>
                )}

                {archives
                    .filter((a) => a !== null)
                    .map(
                        (archive) =>
                            archive && (
                                <section
                                    key={archive.id}
                                    className="mb-12 space-y-5"
                                >
                                    <h2 className="font-serif text-3xl text-[#e6c785]">
                                        {archive.title}
                                    </h2>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {archive.winners.map(
                                            (winner, i) => (
                                                <article
                                                    key={i}
                                                    className="rounded-xl border border-[#d4af37]/30 bg-[#18171b] p-5"
                                                >
                                                    <p className="text-sm text-white/50">
                                                        {winner.category}
                                                    </p>

                                                    <h3 className="mt-2 font-serif text-2xl">
                                                        🏆 {winner.winner}
                                                    </h3>

                                                    {winner.message && (
                                                        <p className="mt-4 text-sm text-white/70">
                                                            {winner.message}
                                                        </p>
                                                    )}

                                                    {winner.signedUrl && (
                                                        <video
                                                            src={winner.signedUrl}
                                                            controls
                                                            preload="none"
                                                            className="mt-4 w-full rounded-lg"
                                                        />
                                                    )}
                                                </article>
                                            )
                                        )}
                                    </div>
                                </section>
                            )
                    )}
            </main>

            <Footer />
        </div>
    );
}
export default function WinnersPage() {
    return (
        <Suspense
            fallback={
                <main className="flex min-h-screen items-center justify-center bg-[#0b0b0d] text-[#e6c785]">
                    <p>🏆 Cargando historial de ganadores...</p>
                </main>
            }
        >
            <WinnersContent />
        </Suspense>
    );
}