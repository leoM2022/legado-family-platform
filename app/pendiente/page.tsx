
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";

async function PendingStatus() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name, approval_status")
        .eq("id", user.id)
        .maybeSingle();

    if (error || !profile) {
        return (
            <p role="alert" className="text-red-400">
                No pudimos consultar el estado de tu cuenta.
            </p>
        );
    }

    const approved = profile.approval_status === "approved";
    const rejected = profile.approval_status === "rejected";

    return (
        <div className="text-center">
            <p className="mb-6 text-5xl">
                {approved ? "✅" : rejected ? "✉️" : "⏳"}
            </p>

            <h1 className="font-serif text-3xl text-[#e6c785]">
                {approved
                    ? "¡Acceso aprobado!"
                    : rejected
                        ? "Solicitud no aprobada"
                        : "Solicitud pendiente"}
            </h1>

            <p className="mt-6 text-white/70">
                Hola, {profile.display_name}.
            </p>

            <p className="mt-4 leading-7 text-white/60">
                {approved
                    ? "Tu cuenta está autorizada para acceder a Legado."
                    : rejected
                        ? "Tu solicitud no fue aprobada. Consultá con el administrador."
                        : "Tu cuenta está esperando la aprobación del administrador familiar."}
            </p>

            {approved && (
                <Link
                    href="/mi-espacio"
                    className="mt-8 inline-block rounded-full bg-[#d4af37] px-7 py-3 font-semibold text-black"
                >
                    Entrar a mi espacio
                </Link>

            )}

            <LogoutButton />
        </div>
    );
}

export default function PendingPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-6 text-white">
            <div className="w-full max-w-lg rounded-2xl border border-[#d4af37]/25 bg-[#18171b] p-10">
                <Suspense
                    fallback={
                        <p className="text-center text-[#e6c785]">
                            Consultando tu cuenta...
                        </p>
                    }
                >
                    <PendingStatus />
                </Suspense>
            </div>
        </main>
    );
}
