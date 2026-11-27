
"use client";

import {
    useState,
    type ChangeEvent,
} from "react";

import { createClient } from "@/lib/supabase/client";
import {
    saveCeremonyMedia,
} from "@/app/admin/ceremonia/actions";

type Props = {
    editionId: string;
    categoryId: string;
    intro: string;
    winner: string;
    currentPath: string | null;
};

export default function CeremonyMediaForm({
                                              editionId,
                                              categoryId,
                                              intro,
                                              winner,
                                              currentPath,
                                          }: Props) {
    const [path, setPath] = useState(
        currentPath ?? ""
    );

    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");

    async function upload(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0];

        if (!file) return;

        setMessage("");

        if (
            file.type !== "video/mp4" ||
            file.size > 6 * 1024 * 1024
        ) {
            setMessage(
                "Seleccioná un MP4 de hasta 6 MB."
            );
            return;
        }

        setBusy(true);

        const supabase = createClient();

        const nextPath =
            `${editionId}/${categoryId}/${crypto.randomUUID()}.mp4`;

        const { error } = await supabase.storage
            .from("family-ceremony-media")
            .upload(nextPath, file, {
                contentType: "video/mp4",
                upsert: false,
            });

        if (error) {
            setMessage(
                `No se pudo subir el video: ${error.message}`
            );
        } else {
            setPath(nextPath);

            setMessage(
                "Video subido. Ahora pulsá Guardar guiones y video."
            );
        }

        setBusy(false);
    }

    return (
        <form
            action={saveCeremonyMedia}
            className="gala-live-desk mt-5 space-y-3"
        >
            <input
                type="hidden"
                name="category_id"
                value={categoryId}
            />

            <input
                type="hidden"
                name="video_path"
                value={path}
            />

            <h4 className="gala-kicker">Guiones y video</h4>

            <label className="block text-sm">
                Introducción de la terna
            </label>

            <textarea
                name="intro_script"
                maxLength={1200}
                rows={3}
                defaultValue={intro}
                className="w-full rounded-lg bg-black/40 p-3 text-white"
            />

            <label className="block text-sm">
                Anuncio del ganador (para leer después de revelar)
            </label>

            <textarea
                name="winner_script"
                maxLength={800}
                rows={3}
                defaultValue={winner}
                className="w-full rounded-lg bg-black/40 p-3 text-white"
            />

            <label className="block text-sm">
                Video opcional del ganador (MP4, máximo 6 MB)
            </label>

            <input
                type="file"
                accept="video/mp4"
                onChange={upload}
                disabled={busy}
                className="block w-full text-sm text-white/70"
            />

            {path && (
                <p className="break-all text-xs text-white/50">
                    Video seleccionado: {path}
                </p>
            )}

            {path && (
                <button
                    type="button"
                    onClick={() => setPath("")}
                    className="text-xs underline"
                >
                    Desvincular video
                </button>
            )}

            {message && (
                <p
                    role="status"
                    className="text-sm text-[#e6c785]"
                >
                    {message}
                </p>
            )}

            <button
                type="submit"
                disabled={busy}
                className="gala-button gala-button--gold"
            >
                Guardar guiones y video
            </button>
        </form>
    );
}
