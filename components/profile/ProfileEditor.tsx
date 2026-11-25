
"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export type ProfileData = {
    nickname: string;
    birthday_day: number | null;
    birthday_month: number | null;
    current_status: string;
    favorite_food: string;
    favorite_color: string;
    currently_into: string;
    show_nickname: boolean;
    show_birthday: boolean;
    show_status: boolean;
    show_favorites: boolean;
};

interface ProfileEditorProps {
    initialProfile: ProfileData;
}

const inputClass =
    "w-full rounded-xl border border-white/15 bg-[#0b0b0d] p-3 text-white outline-none focus:border-[#d4af37]";

const months = [
    "Enero", "Febrero", "Marzo", "Abril",
    "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type VisibilityKey =
    | "show_nickname"
    | "show_birthday"
    | "show_status"
    | "show_favorites";

const visibilityOptions: {
    key: VisibilityKey;
    label: string;
}[] = [
    {
        key: "show_nickname",
        label: "Compartir mi apodo",
    },
    {
        key: "show_birthday",
        label: "Mostrar mi cumpleaños",
    },
    {
        key: "show_status",
        label: "Compartir mi estado actual",
    },
    {
        key: "show_favorites",
        label: "Compartir mis gustos y favoritos",
    },
];

export default function ProfileEditor({
                                          initialProfile,
                                      }: ProfileEditorProps) {
    const [values, setValues] = useState(initialProfile);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    function update<K extends keyof ProfileData>(
        key: K,
        value: ProfileData[K]
    ) {
        setValues((previous) => ({
            ...previous,
            [key]: value,
        }));

        setMessage("");
    }

    async function handleSave(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setSaving(true);
        setMessage("");
        setErrorMessage("");

        try {
            const day = values.birthday_day;
            const month = values.birthday_month;

            // Se debe indicar día y mes juntos
            if ((day === null) !== (month === null)) {
                setErrorMessage(
                    "Completá el día y mes del cumpleaños, o dejá ambos vacíos."
                );
                return;
            }

            // Validar fechas como el 31 de abril
            if (day !== null && month !== null) {
                const maxDays = new Date(
                    Date.UTC(2024, month, 0)
                ).getUTCDate();

                if (day < 1 || day > maxDays) {
                    setErrorMessage("La fecha de cumpleaños no es válida.");
                    return;
                }
            }

            const supabase = createClient();

            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
                setErrorMessage(
                    "Tu sesión expiró. Iniciá sesión nuevamente."
                );
                return;
            }

            const { error } = await supabase
                .from("profile_details")
                .upsert(
                    {
                        user_id: user.id,
                        ...values,
                        updated_at: new Date().toISOString(),
                    },
                    {
                        onConflict: "user_id",
                    }
                );

            if (error) {
                console.error("Error al guardar perfil:", error.message);

                setErrorMessage(
                    "No se pudo guardar tu perfil. Revisá los permisos."
                );
                return;
            }

            setMessage("¡Tu perfil se guardó correctamente!");
        } catch {
            setErrorMessage(
                "Ocurrió un error inesperado al guardar."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSave} className="space-y-8">

            {/* Datos personales */}
            <section className="rounded-2xl border border-[#d4af37]/20 bg-[#18171b] p-6 sm:p-8">
                <h2 className="mb-6 font-serif text-2xl text-[#e6c785]">
                    Sobre mí
                </h2>

                <div className="space-y-5">
                    <div>
                        <label htmlFor="nickname" className="mb-2 block text-sm">
                            Mi apodo
                        </label>
                        <input
                            id="nickname"
                            className={inputClass}
                            maxLength={60}
                            value={values.nickname}
                            onChange={(e) =>
                                update("nickname", e.target.value)
                            }
                            placeholder="¿Cómo te dicen en casa?"
                        />
                    </div>

                    <div>
                        <p className="mb-3 text-sm">Mi cumpleaños</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label
                                    htmlFor="birthday_day"
                                    className="mb-2 block text-xs text-white/60"
                                >
                                    Día
                                </label>
                                <select
                                    id="birthday_day"
                                    className={inputClass}
                                    value={values.birthday_day ?? ""}
                                    onChange={(e) =>
                                        update(
                                            "birthday_day",
                                            e.target.value
                                                ? Number(e.target.value)
                                                : null
                                        )
                                    }
                                >
                                    <option value="">Sin indicar</option>
                                    {Array.from(
                                        { length: 31 },
                                        (_, index) => index + 1
                                    ).map((day) => (
                                        <option key={day} value={day}>
                                            {day}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="birthday_month"
                                    className="mb-2 block text-xs text-white/60"
                                >
                                    Mes
                                </label>
                                <select
                                    id="birthday_month"
                                    className={inputClass}
                                    value={values.birthday_month ?? ""}
                                    onChange={(e) =>
                                        update(
                                            "birthday_month",
                                            e.target.value
                                                ? Number(e.target.value)
                                                : null
                                        )
                                    }
                                >
                                    <option value="">Sin indicar</option>
                                    {months.map((name, index) => (
                                        <option key={name} value={index + 1}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="current_status"
                            className="mb-2 block text-sm"
                        >
                            Mi estado actual
                        </label>
                        <input
                            id="current_status"
                            list="status-options"
                            className={inputClass}
                            maxLength={100}
                            value={values.current_status}
                            onChange={(e) =>
                                update("current_status", e.target.value)
                            }
                            placeholder="¿Qué estás haciendo?"
                        />
                        <datalist id="status-options">
                            <option value="Disponible" />
                            <option value="Estudiando" />
                            <option value="Trabajando" />
                            <option value="Modo vacaciones" />
                        </datalist>
                    </div>
                </div>
            </section>

            {/* Gustos */}
            <section className="rounded-2xl border border-[#d4af37]/20 bg-[#18171b] p-6 sm:p-8">
                <h2 className="mb-6 font-serif text-2xl text-[#e6c785]">
                    Mis gustos y favoritos
                </h2>

                <div className="space-y-5">
                    <div>
                        <label htmlFor="food" className="mb-2 block text-sm">
                            Comida favorita
                        </label>
                        <input
                            id="food"
                            className={inputClass}
                            maxLength={100}
                            placeholder="Ej. Pizza"
                            value={values.favorite_food}
                            onChange={(e) =>
                                update("favorite_food", e.target.value)
                            }
                        />
                    </div>

                    <div>
                        <label htmlFor="color" className="mb-2 block text-sm">
                            Color favorito
                        </label>
                        <input
                            id="color"
                            className={inputClass}
                            maxLength={50}
                            placeholder="Ej. Azul"
                            value={values.favorite_color}
                            onChange={(e) =>
                                update("favorite_color", e.target.value)
                            }
                        />
                    </div>

                    <div>
                        <label htmlFor="into" className="mb-2 block text-sm">
                            ¿En qué ando hoy?
                        </label>
                        <textarea
                            id="into"
                            className={inputClass}
                            rows={3}
                            maxLength={300}
                            placeholder="Una serie, un libro, un videojuego..."
                            value={values.currently_into}
                            onChange={(e) =>
                                update("currently_into", e.target.value)
                            }
                        />
                    </div>
                </div>
            </section>

            {/* Privacidad */}
            <section className="rounded-2xl border border-[#d4af37]/20 bg-[#18171b] p-6 sm:p-8">
                <h2 className="font-serif text-2xl text-[#e6c785]">
                    Mi privacidad
                </h2>

                <p className="mt-3 mb-6 text-sm leading-6 text-white/60">
                    Elegí qué información querés compartir con
                    los miembros aprobados de la familia.
                </p>

                <div className="space-y-5">
                    {visibilityOptions.map((option) => (
                        <label
                            key={option.key}
                            className="flex cursor-pointer items-center gap-4"
                        >
                            <input
                                type="checkbox"
                                checked={values[option.key]}
                                onChange={(e) =>
                                    update(option.key, e.target.checked)
                                }
                                className="h-5 w-5 accent-[#d4af37]"
                            />

                            <span className="text-sm text-white/80">
                {option.label}
              </span>
                        </label>
                    ))}
                </div>

                <p className="mt-6 text-xs leading-6 text-white/40">
                    Por ahora, estos ajustes se guardan pero
                    tus datos siguen siendo privados.
                    La vista familiar llegará en la próxima etapa.
                </p>
            </section>

            {/* Guardado */}
            {errorMessage && (
                <p role="alert" className="text-sm text-red-400">
                    {errorMessage}
                </p>
            )}

            {message && (
                <p role="status" className="text-sm text-green-400">
                    {message}
                </p>
            )}

            <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-[#d4af37] px-8 py-4 font-semibold text-black transition hover:bg-[#e6c785] disabled:opacity-50"
            >
                {saving ? "Guardando..." : "Guardar mi perfil"}
            </button>
        </form>
    );
}
