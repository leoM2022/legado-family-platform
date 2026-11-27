
"use client";

import SplitText from "@/components/ui/SplitText";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Props = {
    editionId: string;
};

export default function CeremonySafetyOverlay({
                                                  editionId,
                                              }: Props) {
    const supabase = useMemo(() => createClient(), []);

    const [paused, setPaused] = useState<boolean | null>(null);
    const [disconnected, setDisconnected] = useState(false);

    useEffect(() => {
        let active = true;

        async function refresh() {
            const { data, error } = await supabase.rpc(
                "family_ceremony_pause_status",
                {
                    p_edition_id: editionId,
                }
            );

            if (!active) return;

            if (error) {
                setDisconnected(true);
            } else {
                setDisconnected(false);
                setPaused(data === true);
            }
        }

        void refresh();

        const interval = setInterval(() => {
            void refresh();
        }, 2000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [editionId, supabase]);

    const blocked = paused !== false || disconnected;

    useEffect(() => {
        if (!blocked) return;

        // Detener cualquier video que esté reproduciéndose
        // detrás de la pantalla de emergencia.
        document.querySelectorAll("video").forEach((video) => {
            video.pause();
        });
    }, [blocked]);

    if (!blocked) return null;

    let message = "Preparando escenario...";

    if (disconnected) {
        message = "Conexión interrumpida";
    } else if (paused) {
        message = "Hacemos una pequeña pausa";
    }

    return (
        <div role="status" className="gala-stage gala-stage-overlay inset-0 z-[100] flex min-h-svh flex-col items-center justify-center px-8 text-center text-[#f5e5bd]">
            <div aria-hidden="true" className="gala-stage-mark mb-6">✦</div>

            <p className="mb-5 text-xs uppercase tracking-[0.4em] text-[#d4af37]">
                GoyaAwards · Ceremonia familiar
            </p>

            <h1 key={message}><SplitText text={message} /></h1>

            <p className="mt-7 max-w-xl text-white/60">
                {disconnected
                    ? "Estamos intentando recuperar el estado de la ceremonia."
                    : paused
                        ? "Enseguida continuamos con nuestra entrega de premios."
                        : "Comprobando que todo esté listo para comenzar."}
            </p>
        </div>
    );
}
