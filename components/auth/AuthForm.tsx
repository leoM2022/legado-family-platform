
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface AuthFormProps {
    mode: "login" | "register";
}

export default function AuthForm({ mode }: AuthFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const isRegister = mode === "register";

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setLoading(true);

        try {
            const formData = new FormData(event.currentTarget);

            const name = String(formData.get("name") ?? "").trim();
            const email = String(formData.get("email") ?? "").trim().toLowerCase();
            const password = String(formData.get("password") ?? "");

            if (isRegister) {
                if (name.length < 2 || name.length > 80) {
                    setErrorMessage("Ingresá un nombre válido.");
                    return;
                }

                if (password.length < 8) {
                    setErrorMessage("La contraseña debe tener al menos 8 caracteres.");
                    return;
                }

                const supabase = createClient();

                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { display_name: name },
                        emailRedirectTo: `${window.location.origin}/login`,
                    },
                });

                if (error) {
                    setErrorMessage(error.message);
                    return;
                }

                router.push("/registro/confirmar");
            } else {
                const supabase = createClient();

                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    setErrorMessage(error.message);
                    return;
                }

                router.replace("/pendiente");
                router.refresh();
            }
        } catch {
            setErrorMessage("Ocurrió un error. Intentá nuevamente.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-md rounded-2xl border border-[#d4af37]/25 bg-[#18171b] p-8 shadow-2xl">
            <div className="mb-8 text-center">
                <Link
                    href="/"
                    className="font-serif text-3xl text-[#e6c785]"
                >
                    Legado
                </Link>

                <h1 className="mt-8 font-serif text-3xl text-white">
                    {isRegister ? "Solicitar acceso" : "Bienvenido nuevamente"}
                </h1>

                <p className="mt-3 text-sm leading-6 text-white/60">
                    {isRegister
                        ? "Registrate para solicitar tu ingreso a la familia."
                        : "Ingresá con tu cuenta para continuar."}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {isRegister && (
                    <div>
                        <label htmlFor="name" className="mb-2 block text-sm">
                            Nombre completo
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            minLength={2}
                            maxLength={80}
                            autoComplete="name"
                            className="w-full rounded-lg border border-white/15 bg-[#0b0b0d] p-3 text-white outline-none focus:border-[#d4af37]"
                            placeholder="Tu nombre"
                        />
                    </div>
                )}

                <div>
                    <label htmlFor="email" className="mb-2 block text-sm">
                        Correo electrónico
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        className="w-full rounded-lg border border-white/15 bg-[#0b0b0d] p-3 text-white outline-none focus:border-[#d4af37]"
                        placeholder="correo@ejemplo.com"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="mb-2 block text-sm">
                        Contraseña
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={isRegister ? 8 : undefined}
                        autoComplete={isRegister ? "new-password" : "current-password"}
                        className="w-full rounded-lg border border-white/15 bg-[#0b0b0d] p-3 text-white outline-none focus:border-[#d4af37]"
                    />
                </div>

                {errorMessage && (
                    <p role="alert" className="text-sm text-red-400">
                        {errorMessage}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-[#d4af37] p-4 font-semibold text-black transition hover:bg-[#e6c785] disabled:opacity-50"
                >
                    {loading
                        ? "Procesando..."
                        : isRegister
                            ? "Solicitar registro"
                            : "Iniciar sesión"}
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-white/60">
                {isRegister ? "¿Ya tenés cuenta?" : "¿Todavía no tenés cuenta?"}{" "}
                <Link
                    href={isRegister ? "/login" : "/registro"}
                    className="text-[#e6c785] hover:underline"
                >
                    {isRegister ? "Iniciar sesión" : "Registrarse"}
                </Link>
            </p>
        </div>
    );
}
