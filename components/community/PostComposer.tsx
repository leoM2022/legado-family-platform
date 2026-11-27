
"use client";

import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";

import Image from "next/image";
import { createPost } from "@/app/comunidad/actions";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "family-post-images";
const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;
const MAX_STORED_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validatePhoto(file: File) {
    if (!PHOTO_TYPES.includes(file.type)) {
        throw new Error("Solo JPG, PNG o WebP.");
    }

    if (file.size > MAX_ORIGINAL_BYTES) {
        throw new Error(
            "La imagen original supera los 10 MB."
        );
    }
}

async function compressPhoto(file: File): Promise<Blob> {
    validatePhoto(file);

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

export default function PostComposer() {
    const router = useRouter();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [content, setContent] = useState("");
    const [attachment, setAttachment] = useState<{ file: File; preview: string } | null>(null);
    const [working, setWorking] = useState(false);
    const [notice, setNotice] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const preview = attachment?.preview;

    useEffect(() => () => {
        if (preview) URL.revokeObjectURL(preview);
    }, [preview]);

    function clearPhoto() {
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
        const selected = event.target.files?.[0];
        if (!selected) return;
        setNotice("");
        setErrorMessage("");
        try {
            validatePhoto(selected);
            setAttachment({ file: selected, preview: URL.createObjectURL(selected) });
        } catch (error) {
            clearPhoto();
            setErrorMessage(error instanceof Error ? error.message : "No se pudo adjuntar la foto.");
        }
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (working) return;

        if (
            content.trim().length < 1 ||
            content.trim().length > 1200
        ) {
            setErrorMessage(
                "Escribí un texto de entre 1 y 1200 caracteres."
            );
            return;
        }

        setWorking(true);
        setNotice("");

        setErrorMessage("");
        const file = attachment?.file;
        if (!file) {
            try {
                const data = new FormData();
                data.set("content", content);
                await createPost(data);
                setContent("");
                setNotice("Publicación compartida.");
            } catch {
                setErrorMessage("No se pudo publicar el texto. Volvé a intentarlo.");
            } finally {
                setWorking(false);
            }
            return;
        }

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
            clearPhoto();
            setNotice("Publicación con foto compartida.");

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

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Ocurrió un error."
            );
        } finally {
            setWorking(false);
        }
    }

    return (
        <section className="gala-panel p-4 sm:p-6" aria-labelledby="community-composer">
            <h2 id="community-composer" className="mb-3 font-serif text-2xl text-[#fff0d3]">Compartir un momento</h2>
            <form onSubmit={handleSubmit} aria-busy={working} className="space-y-3">
                <label htmlFor="community-post-text" className="sr-only">Texto de la publicación</label>
                <textarea id="community-post-text" name="content" value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="¿Qué querés compartir con tu familia?"
                    required maxLength={1200} rows={3} disabled={working}
                    className="block w-full resize-y rounded-xl border border-white/15 bg-black/30 p-3 text-white placeholder:text-white/55"
                />
                <input ref={fileInputRef} type="file" accept={PHOTO_TYPES.join(",")}
                    aria-label="Elegir fotografía" onChange={choosePhoto} disabled={working} className="hidden" />
                {preview && (
                    <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-[#e6c785]/20 bg-black/25 p-2">
                        <Image src={preview} alt="Vista previa de la fotografía" width={96} height={72}
                            unoptimized className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                        <span className="min-w-0 flex-1 wrap-break-word text-sm text-white/75">{attachment?.file.name}</span>
                        <button type="button" className="gala-button" disabled={working} onClick={clearPhoto}>Quitar foto</button>
                    </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={working}
                        aria-describedby="community-photo-rules" className="gala-button">
                        {attachment ? "Cambiar foto" : "Adjuntar foto"}
                    </button>
                    <button type="submit" disabled={working || !content.trim()} className="gala-button gala-button--gold">
                        {working ? "Publicando…" : "Publicar"}
                    </button>
                </div>
                <p id="community-photo-rules" className="text-xs text-white/65">JPG, PNG o WebP, hasta 10 MB.</p>
                {errorMessage && <p role="alert" className="text-sm text-red-300">{errorMessage}</p>}
                {notice && <p role="status" className="text-sm text-[#e6c785]">{notice}</p>}
            </form>
        </section>
    );
}
