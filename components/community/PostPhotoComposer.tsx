
"use client";

import {
    useRef,
    useState,
    type FormEvent,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "family-post-images";
const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;
const MAX_STORED_BYTES = 2 * 1024 * 1024;

async function compressPhoto(file: File): Promise<Blob> {
    const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (!allowed.includes(file.type)) {
        throw new Error("Solo JPG, PNG o WebP.");
    }

    if (file.size > MAX_ORIGINAL_BYTES) {
        throw new Error(
            "La imagen original supera los 10 MB."
        );
    }

    const image = await createImageBitmap(file);

    try {
        const scale = Math.min(
            1,
            1600 / Math.max(image.width, image.height)
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.max(
            1,
            Math.round(image.width * scale)
        );

        canvas.height = Math.max(
            1,
            Math.round(image.height * scale)
        );

        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("No se pudo procesar la imagen.");
        }

        context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height
        );

        const blob = await new Promise<Blob>(
            (resolve, reject) => {
                canvas.toBlob(
                    (result) => {
                        if (
                            result &&
                            result.type === "image/webp"
                        ) {
                            resolve(result);
                        } else {
                            reject(
                                new Error(
                                    "No se pudo convertir la imagen a WebP."
                                )
                            );
                        }
                    },
                    "image/webp",
                    0.75
                );
            }
        );

        if (blob.size > MAX_STORED_BYTES) {
            throw new Error(
                "La foto procesada supera los 2 MB. Elegí otra."
            );
        }

        return blob;
    } finally {
        image.close();
    }
}

export default function PostPhotoComposer() {
    const router = useRouter();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [content, setContent] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [working, setWorking] = useState(false);
    const [notice, setNotice] = useState("");

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (working) return;

        if (!file) {
            setNotice("Elegí una foto para esta publicación.");
            return;
        }

        if (
            content.trim().length < 1 ||
            content.trim().length > 1200
        ) {
            setNotice(
                "Escribí un texto de entre 1 y 1200 caracteres."
            );
            return;
        }

        setWorking(true);
        setNotice("");

        const supabase = createClient();
        let uploadedPath: string | null = null;

        try {
            // 1. Preparar la imagen.
            const photo = await compressPhoto(file);

            // 2. Identificar al usuario.
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new Error("Iniciá sesión nuevamente.");
            }

            // 3. Crear una ruta única.
            uploadedPath =
                `${user.id}/${crypto.randomUUID()}.webp`;

            // 4. Subir al bucket privado.
            const { error: uploadError } =
                await supabase.storage
                    .from(BUCKET)
                    .upload(uploadedPath, photo, {
                        contentType: "image/webp",
                        cacheControl: "60",
                        upsert: false,
                    });

            if (uploadError) {
                throw new Error(
                    `Error al subir: ${uploadError.message}`
                );
            }

            // 5. Vincular foto y publicación.
            // PostgreSQL verifica nuevamente los permisos.
            const { error: createError } =
                await supabase.rpc(
                    "create_family_post_with_image",
                    {
                        p_content: content.trim(),
                        p_image_path: uploadedPath,
                    }
                );

            if (createError) {
                throw new Error(
                    `No se pudo publicar: ${createError.message}`
                );
            }

            // El archivo ya pertenece a la publicación.
            uploadedPath = null;

            setContent("");
            setFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            setNotice("¡Publicación con foto creada!");

            router.refresh();
        } catch (error) {
            // Si falla la publicación, eliminar la foto temporal.
            if (uploadedPath) {
                const { error: cleanupError } =
                    await supabase.storage
                        .from(BUCKET)
                        .remove([uploadedPath]);

                if (cleanupError) {
                    console.error(
                        "No se pudo limpiar el archivo provisional:",
                        cleanupError.message
                    );
                }
            }

            setNotice(
                error instanceof Error
                    ? error.message
                    : "Ocurrió un error."
            );
        } finally {
            setWorking(false);
        }
    }

    return (
        <section className="gala-panel p-6">
            <h2 className="mb-4 font-serif text-2xl text-[#e6c785]">
                Publicar con fotografía
            </h2>

            <form
                onSubmit={handleSubmit}
                className="space-y-4"
            >
                <label
                    htmlFor="photo-post-text"
                    className="block text-sm text-white/70"
                >
                    Texto de la publicación
                </label>

                <textarea
                    id="photo-post-text"
                    value={content}
                    onChange={(event) =>
                        setContent(event.target.value)
                    }
                    required
                    maxLength={1200}
                    rows={3}
                    className="w-full rounded-xl border border-white/15 bg-[#0b0b0d] p-3 text-white"
                />

                <label
                    htmlFor="photo-post-file"
                    className="block text-sm text-white/70"
                >
                    Fotografía (JPG, PNG o WebP; hasta 10 MB)
                </label>

                <input
                    id="photo-post-file"
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={working}
                    onChange={(event) =>
                        setFile(event.target.files?.[0] ?? null)
                    }
                    className="block w-full text-sm text-white/70"
                />

                <p className="text-xs text-white/50">
                    La fotografía se compartirá con familiares
                    aprobados. Se convierte a WebP y se guarda
                    en un bucket privado.
                </p>

                <button
                    type="submit"
                    disabled={working || !file}
                    className="gala-button gala-button--gold"
                >
                    {working
                        ? "Subiendo..."
                        : "Publicar con foto"}
                </button>

                {notice && (
                    <p
                        role="status"
                        className="text-sm text-[#e6c785]"
                    >
                        {notice}
                    </p>
                )}
            </form>
        </section>
    );
}
