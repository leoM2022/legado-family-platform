import GalaEmptyState from "@/components/ui/GalaEmptyState";
import SplitText from "@/components/ui/SplitText";
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
                year: archive.year,
                winners,
            };
        })
    );

    return (
        <div className="gala-room">
            <Navbar />

            <main className="mx-auto max-w-5xl px-6 py-16">
                <Link
                    href="/mi-espacio"
                    className="gala-kicker"
                >
                    ← Volver
                </Link>

                <h1 className="my-10 font-serif text-4xl text-[#e6c785]"><SplitText text="Historial de Legado" /></h1>

                {published.length === 0 && (
                    <GalaEmptyState title="El telón aún no se abrió">
                        <p>Los ganadores, sus mensajes y videos aparecerán acá cuando se publique la primera ceremonia.</p>
                    </GalaEmptyState>
                )}

                {archives
                    .filter((a) => a !== null)
                    .map(
                        (archive) =>
                            archive && (
                                <section
                                    key={archive.id}
                                    className="mb-12 space-y-5 border-t border-[#e6c785]/25 pt-7"
                                >
                                    <p className="gala-kicker">Edición {archive.year}</p>
                                    <h2 className="font-serif text-3xl text-[#e6c785]">
                                        {archive.title}
                                    </h2>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {archive.winners.map(
                                            (winner, i) => (
                                                <article
                                                    key={i}
                                                    className="gala-panel gala-card p-5"
                                                >
                                                    <p className="gala-kicker">
                                                        {winner.category}
                                                    </p>

                                                    <h3 className="mt-2 font-serif text-2xl">
                                                        {winner.winner}
                                                    </h3>

                                                    {winner.message && (
                                                        <p className="mt-4 whitespace-pre-wrap border-l border-[#e6c785]/40 pl-4 leading-relaxed text-white/75">
                                                            {winner.message}
                                                        </p>
                                                    )}

                                                    {winner.signedUrl && (
                                                        <video
                                                            src={winner.signedUrl}
                                                            controls
                                                            preload="none"
                                                            className="mt-4 aspect-video w-full rounded-lg bg-black object-contain"
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