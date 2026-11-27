
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper, { type Area } from "react-easy-crop";

import { createClient } from "@/lib/supabase/client";

interface AvatarUploaderProps {
    initialPath: string | null;
}

type Notice = {
    type: "success" | "error";
    text: string;
};

const BUCKET = "family-avatars";
const MAX_ORIGINAL_SIZE = 8 * 1024 * 1024;
const MAX_UPLOAD_SIZE = 1024 * 1024;

async function createCroppedImage(
    source: string,
    pixels: Area
): Promise<Blob> {
    const image = new window.Image();
    image.src = source;

    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("No se pudo procesar la imagen.");
    }

    ctx.drawImage(
        image,
        pixels.x,
        pixels.y,
        pixels.width,
        pixels.height,
        0,
        0,
        512,
        512
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (result) => {
                if (result && result.type === "image/webp") {
                    resolve(result);
                } else {
                    reject(
                        new Error("No se pudo generar la imagen WebP.")
                    );
                }
            },
            "image/webp",
            0.82
        );
    });

    if (blob.size > MAX_UPLOAD_SIZE) {
        throw new Error("La imagen procesada supera 1 MB.");
    }

    return blob;
}

export default function AvatarUploader({
                                           initialPath,
                                       }: AvatarUploaderProps) {
    const router = useRouter();

    const [path, setPath] = useState(initialPath);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);

    // Imagen elegida pero todavía no guardada.
    const [sourceUrl, setSourceUrl] = useState<string | null>(
        null
    );

    // Posición y zoom del recortador.
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [cropPixels, setCropPixels] = useState<Area | null>(
        null
    );

    const [working, setWorking] = useState(false);
    const [notice, setNotice] = useState<Notice | null>(null);

    // Recuperar la foto guardada desde Storage privado.
    useEffect(() => {
        let active = true;

        async function loadAvatar() {
            setPhotoUrl(null);

            if (!path) return;

            const supabase = createClient();

            const { data, error } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(path, 300);

            if (active && !error) {
                setPhotoUrl(data.signedUrl);
            }
        }

        void loadAvatar();

        return () => {
            active = false;
        };
    }, [path]);

    // Liberar imágenes temporales del navegador.
    useEffect(() => {
        return () => {
            if (sourceUrl) {
                URL.revokeObjectURL(sourceUrl);
            }
        };
    }, [sourceUrl]);

    function selectPhoto(file: File) {
        setNotice(null);

        if (
            !["image/jpeg", "image/png", "image/webp"].includes(
                file.type
            )
        ) {
            setNotice({
                type: "error",
                text: "Elegí una imagen JPG, PNG o WebP.",
            });
            return;
        }

        if (file.size > MAX_ORIGINAL_SIZE) {
            setNotice({
                type: "error",
                text: "La fotografía supera los 8 MB.",
            });
            return;
        }

        setSourceUrl(URL.createObjectURL(file));
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCropPixels(null);
    }

    function cancelCrop() {
        if (working) return;

        setSourceUrl(null);
        setCropPixels(null);
        setZoom(1);
    }

    async function saveCrop() {
        if (!sourceUrl || !cropPixels || working) return;

        setWorking(true);
        setNotice(null);

        try {
            const blob = await createCroppedImage(
                sourceUrl,
                cropPixels
            );

            const supabase = createClient();

            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new Error("Iniciá sesión nuevamente.");
            }

            const nextPath =
                `${user.id}/${crypto.randomUUID()}.webp`;

            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(nextPath, blob, {
                    contentType: "image/webp",
                    cacheControl: "300",
                    upsert: false,
                });

            if (uploadError) {
                throw new Error(
                    `No se pudo subir la foto: ${uploadError.message}`
                );
            }

            const { error: saveError } = await supabase
                .from("profile_details")
                .upsert(
                    {
                        user_id: user.id,
                        avatar_path: nextPath,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id" }
                );

            if (saveError) {
                // Evitar dejar un archivo sin asociar.
                await supabase.storage
                    .from(BUCKET)
                    .remove([nextPath]);

                throw new Error("No se pudo guardar el avatar.");
            }

            const previousPath = path;

            setPath(nextPath);
            setSourceUrl(null);
            setCropPixels(null);

            // La foto anterior ya no es necesaria.
            if (previousPath && previousPath !== nextPath) {
                const { error: deleteError } =
                    await supabase.storage
                        .from(BUCKET)
                        .remove([previousPath]);

                if (deleteError) {
                    console.warn(
                        "No se pudo eliminar la foto anterior:",
                        deleteError.message
                    );
                }
            }

            setNotice({
                type: "success",
                text: "¡Tu nueva fotografía se guardó correctamente!",
            });
        } catch (error) {
            setNotice({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "No se pudo guardar la fotografía.",
            });
        } finally {
            setWorking(false);
        }
    }

    async function deleteAvatar() {
        if (!path || working) return;

        const confirmed = window.confirm(
            "¿Querés eliminar tu fotografía de perfil?"
        );

        if (!confirmed) return;

        setWorking(true);
        setNotice(null);

        try {
            const supabase = createClient();

            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new Error("Iniciá sesión nuevamente.");
            }

            const previousPath = path;

            // Primero quitar la foto del perfil.
            const { data: updated, error: updateError } =
                await supabase
                    .from("profile_details")
                    .update({
                        avatar_path: null,
                        show_avatar: false,
                        allow_awards_avatar: false,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("user_id", user.id)
                    .eq("avatar_path", previousPath)
                    .select("user_id")
                    .maybeSingle();

            if (updateError || !updated) {
                throw new Error(
                    "No se pudo desvincular la fotografía."
                );
            }

            setPath(null);
            setPhotoUrl(null);

            // Luego eliminar el archivo de Storage.
            const { error: deleteError } =
                await supabase.storage
                    .from(BUCKET)
                    .remove([previousPath]);

            if (deleteError) {
                console.error(
                    "Error al limpiar Storage:",
                    deleteError.message
                );

                setNotice({
                    type: "error",
                    text:
                        "La foto ya no aparece en tu perfil, " +
                        "pero no se pudo borrar el archivo de Storage.",
                });
            } else {
                setNotice({
                    type: "success",
                    text: "Tu fotografía fue eliminada.",
                });
            }

            // Actualizar los permisos del formulario.
            router.refresh();
        } catch (error) {
            setNotice({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "No se pudo eliminar la foto.",
            });
        } finally {
            setWorking(false);
        }
    }

    return (
        <section className="mb-8 gala-panel gala-card p-6 text-center sm:p-8">
            <h2 className="mb-6 font-serif text-2xl text-[#e6c785]">
                Mi foto de perfil
            </h2>

            {sourceUrl ? (
                <div className="space-y-6">
                    <p className="text-sm text-white/70">
                        Arrastrá la fotografía para centrarla
                        dentro del círculo.
                    </p>

                    {/* Área interactiva de recorte */}
                    <div className="relative mx-auto h-72 w-full max-w-md overflow-hidden rounded-2xl bg-black">
                        <Cropper
                            image={sourceUrl}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            minZoom={1}
                            maxZoom={3}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={(_, croppedPixels) =>
                                setCropPixels(croppedPixels)
                            }
                        />
                    </div>

                    <div className="mx-auto max-w-sm">
                        <label
                            htmlFor="avatar-zoom"
                            className="mb-3 block text-sm text-white/70"
                        >
                            Ampliar o reducir
                        </label>

                        <input
                            id="avatar-zoom"
                            type="range"
                            min={1}
                            max={3}
                            step={0.01}
                            value={zoom}
                            onChange={(event) =>
                                setZoom(Number(event.target.value))
                            }
                            className="w-full accent-[#d4af37]"
                            disabled={working}
                        />
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => void saveCrop()}
                            disabled={working || !cropPixels}
                            className="rounded-full bg-[#d4af37] px-6 py-3 font-semibold text-black disabled:opacity-50"
                        >
                            {working
                                ? "Guardando..."
                                : "Guardar fotografía"}
                        </button>

                        <button
                            type="button"
                            onClick={cancelCrop}
                            disabled={working}
                            className="rounded-full border border-white/30 px-6 py-3 text-white/80 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-[#d4af37]/50 bg-[#2c251e]">
                        {photoUrl ? (
                            <Image
                                src={photoUrl}
                                alt="Mi foto de perfil"
                                width={128}
                                height={128}
                                unoptimized
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="text-5xl text-[#e6c785]">
                👤
              </span>
                        )}
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                        <label className="inline-block cursor-pointer rounded-full bg-[#d4af37] px-6 py-3 font-semibold text-black">
                            {working
                                ? "Procesando..."
                                : path
                                    ? "Cambiar fotografía"
                                    : "Elegir fotografía"}

                            <input
                                type="file"
                                className="sr-only"
                                accept="image/jpeg,image/png,image/webp"
                                disabled={working}
                                onChange={(event) => {
                                    const file =
                                        event.currentTarget.files?.[0];

                                    if (file) selectPhoto(file);

                                    event.currentTarget.value = "";
                                }}
                            />
                        </label>

                        {path && (
                            <button
                                type="button"
                                onClick={() => void deleteAvatar()}
                                disabled={working}
                                className="rounded-full border border-red-400/40 px-6 py-3 text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                            >
                                Eliminar foto
                            </button>
                        )}
                    </div>

                    <p className="mt-5 text-xs text-white/40">
                        JPG, PNG o WebP. Hasta 8 MB de origen.
                        Se guardará un recorte cuadrado de 512 × 512.
                    </p>
                </>
            )}

            {notice && (
                <p
                    role={notice.type === "error" ? "alert" : "status"}
                    className={
                        notice.type === "error"
                            ? "mt-6 text-sm text-red-400"
                            : "mt-6 text-sm text-green-400"
                    }
                >
                    {notice.text}
                </p>
            )}
        </section>
    );
}
