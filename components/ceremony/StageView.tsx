
"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Screen = {
    edition_title: string;
    phase:
        | "waiting"
        | "nominees"
        | "revealed"
        | "video"
        | "finished";

    category_title: string | null;

    nominees: {
        title: string;
        symbol: string;
    }[];

    intro_script: string | null;
    winner_title: string | null;
    winner_script: string | null;
    video_path: string | null;

    published_winners: {
        category: string;
        winner: string;
    }[];
};

export default function StageView({
                                      editionId,
                                  }: {
    editionId: string;
}) {
    const supabase = useMemo(
        () => createClient(),
        []
    );

    const [screen, setScreen] =
        useState<Screen | null>(null);

    const [signedVideo, setSignedVideo] = useState<{
        path: string;
        url: string;
    } | null>(null);

    const [error, setError] = useState("");

    // Actualizar la pantalla automáticamente.
    useEffect(() => {
        let active = true;

        async function refresh() {
            const {
                data,
                error: fetchError,
            } = await supabase.rpc(
                "family_ceremony_screen",
                {
                    p_edition_id: editionId,
                }
            );

            if (!active) return;

            if (fetchError) {
                setError(fetchError.message);
            } else {
                setError("");
                setScreen(data as Screen);
            }
        }

        void refresh();

        const timer = setInterval(() => {
            void refresh();
        }, 2000);

        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [editionId, supabase]);

    // El video se firma solo cuando corresponde mostrarlo.
    const currentVideoPath =
        screen?.phase === "video"
            ? screen.video_path
            : null;

    useEffect(() => {
        let active = true;

        if (currentVideoPath) {
            void supabase.storage
                .from("family-ceremony-media")
                .createSignedUrl(currentVideoPath, 300)
                .then(({ data, error: signError }) => {
                    if (active && !signError && data?.signedUrl) {
                        setSignedVideo({
                            path: currentVideoPath,
                            url: data.signedUrl,
                        });
                    }
                });
        }

        return () => {
            active = false;
        };
    }, [currentVideoPath, supabase]);

    const videoUrl =
        currentVideoPath && signedVideo?.path === currentVideoPath
            ? signedVideo.url
            : "";

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-[#09090c] px-8 py-16 text-center text-[#f5e5bd]">
            <p className="mb-8 text-xs uppercase tracking-[0.5em] text-[#d4af37]">
                GoyaAwards · Ceremonia familiar
            </p>

            {error && (
                <p
                    role="alert"
                    className="text-red-300"
                >
                    No se pudo actualizar la gala: {error}
                </p>
            )}

            {!screen && (
                <p>Preparando escenario...</p>
            )}

            {/* PANTALLA DE ESPERA */}

            {screen?.phase === "waiting" && (
                <>
                    <div className="mb-6 text-7xl">
                        🏆
                    </div>

                    <h1 className="font-serif text-5xl">
                        {screen.edition_title}
                    </h1>

                    <p className="mt-6 text-xl text-white/60">
                        La ceremonia está por comenzar
                    </p>
                </>
            )}

            {/* PRESENTACIÓN DE TERNAS */}

            {screen &&
                [
                    "nominees",
                    "revealed",
                    "video",
                ].includes(screen.phase) && (
                    <>
                        <h1 className="font-serif text-4xl sm:text-6xl">
                            {screen.category_title}
                        </h1>

                        {screen.phase === "nominees" && (
                            <>
                                <p className="mt-6 max-w-3xl text-white/70">
                                    {screen.intro_script}
                                </p>

                                <div className="mt-10 grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {screen.nominees.map(
                                        (nominee, i) => (
                                            <div
                                                key={i}
                                                className="rounded-xl border border-[#d4af37]/30 bg-white/5 p-8"
                                            >
                                                <div className="text-5xl">
                                                    {nominee.symbol}
                                                </div>

                                                <h2 className="mt-4 font-serif text-2xl">
                                                    {nominee.title}
                                                </h2>
                                            </div>
                                        )
                                    )}
                                </div>

                                <p className="mt-10 text-[#d4af37]">
                                    Y el Goya es para...
                                </p>
                            </>
                        )}

                        {/* GANADOR REVELADO */}

                        {[
                            "revealed",
                            "video",
                        ].includes(screen.phase) && (
                            <>
                                <div className="mt-8 text-7xl">
                                    🏆
                                </div>

                                <p className="mt-4 text-sm uppercase tracking-widest text-[#d4af37]">
                                    Ganador
                                </p>

                                <h2 className="mt-3 font-serif text-5xl sm:text-7xl">
                                    {screen.winner_title}
                                </h2>

                                <p className="mt-7 max-w-3xl text-xl text-white/70">
                                    {screen.winner_script}
                                </p>

                                {screen.phase === "video" &&
                                    (videoUrl ? (
                                        <video
                                            key={videoUrl}
                                            controls
                                            playsInline
                                            preload="metadata"
                                            src={videoUrl}
                                            className="mt-8 w-full max-w-3xl rounded-xl"
                                        />
                                    ) : (
                                        <p className="mt-5 text-white/60">
                                            Preparando video...
                                        </p>
                                    ))}
                            </>
                        )}
                    </>
                )}

            {/* FINAL */}

            {screen?.phase === "finished" && (
                <>
                    <div className="text-7xl">
                        ✨
                    </div>

                    <h1 className="mt-6 font-serif text-5xl">
                        Gracias por compartir esta gala
                    </h1>

                    <div className="mt-12 grid w-full max-w-4xl gap-3 sm:grid-cols-2">
                        {screen.published_winners.map(
                            (item, i) => (
                                <div
                                    key={i}
                                    className="rounded-xl border border-[#d4af37]/30 p-4"
                                >
                                    <p className="text-sm text-white/50">
                                        {item.category}
                                    </p>

                                    <p className="mt-2 text-xl">
                                        🏆 {item.winner}
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </>
            )}
        </main>
    );
}

// MODO ENSAYO: NO CONSULTA NI MODIFICA RESULTADOS.
export function RehearsalStage() {
    const states = [
        "waiting",
        "nominees",
        "revealed",
        "video",
        "finished",
    ] as const;

    const [step, setStep] = useState(0);

    return (
        <div className="min-h-screen bg-[#09090c] px-6 py-16 text-center text-[#f5e5bd]">
            <p className="mb-6 text-xs uppercase tracking-widest text-[#d4af37]">
                Modo ensayo · Sin datos reales
            </p>

            <h1 className="font-serif text-5xl">
                GoyaAwards · Ensayo
            </h1>

            {step === 0 && (
                <p className="mt-16 text-3xl">
                    La gala está por comenzar
                </p>
            )}

            {step === 1 && (
                <p className="mt-16 text-3xl">
                    Terna ficticia: Mejor momento familiar
                </p>
            )}

            {step === 2 && (
                <p className="mt-16 text-4xl">
                    🏆 Ganador de prueba
                </p>
            )}

            {step === 3 && (
                <p className="mt-16 text-3xl">
                    Aquí se reproduciría el video
                </p>
            )}

            {step === 4 && (
                <p className="mt-16 text-3xl">
                    ¡Gracias por participar!
                </p>
            )}

            <p className="mt-5 text-white/50">
                Estado: {states[step]}
            </p>

            <div className="mt-12 flex justify-center gap-3">
                <button
                    onClick={() =>
                        setStep((s) => Math.max(0, s - 1))
                    }
                    className="rounded-full border border-[#d4af37] px-5 py-2"
                >
                    Atrás
                </button>

                <button
                    onClick={() =>
                        setStep((s) => Math.min(4, s + 1))
                    }
                    className="rounded-full bg-[#d4af37] px-5 py-2 font-semibold text-black"
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
}
