
"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { setCeremonyPaused } from "@/app/admin/ceremonia/safety-actions";

type Props = {
    editionId: string;
};

export default function CeremonyPauseControl({
                                                 editionId,
                                             }: Props) {
    const supabase = useMemo(() => createClient(), []);

    const [paused, setPaused] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function refresh() {
            const { data, error: rpcError } = await supabase.rpc(
                "family_ceremony_pause_status",
                { p_edition_id: editionId }
            );

            if (!active) return;

            if (rpcError) {
                setError("No se pudo consultar el estado de la gala.");
            } else {
                setPaused(data === true);
                setError("");
            }
        }

        void refresh();

        const interval = setInterval(() => {
            void refresh();
        }, 3000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [editionId, supabase]);

    async function togglePause() {
        if (paused === null || busy) return;

        setBusy(true);
        setError("");

        try {
            await setCeremonyPaused(editionId, !paused);
            setPaused(!paused);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo controlar la ceremonia."
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="rounded-xl border border-amber-400/30 bg-black/30 p-4">
            <h4 className="font-semibold text-[#e6c785]">
                Control de seguridad
            </h4>

            <p className="mt-2 text-sm text-white/60">
                {paused === null
                    ? "Comprobando el estado..."
                    : paused
                        ? "La ceremonia está pausada. El escenario muestra una pantalla de espera."
                        : "La ceremonia está activa."}
            </p>

            <button
                type="button"
                disabled={paused === null || busy || Boolean(error)}
                onClick={togglePause}
                className={
                    "mt-4 rounded-full px-6 py-3 font-semibold disabled:opacity-40 " +
                    (paused
                        ? "bg-[#d4af37] text-black"
                        : "bg-red-700 text-white")
                }
            >
                {busy
                    ? "Actualizando..."
                    : paused
                        ? "▶ Reanudar ceremonia"
                        : "⏸ Pausar y ocultar pantalla"}
            </button>

            {paused && (
                <p className="mt-3 text-xs text-amber-300">
                    Reanudá antes de presentar o revelar otro premio.
                </p>
            )}

            {error && (
                <p role="alert" className="mt-3 text-sm text-red-300">
                    {error}
                </p>
            )}
        </div>
    );
}
