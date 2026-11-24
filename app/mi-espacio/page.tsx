
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";
import Link from "next/link";

async function PrivateContent() {
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
        .select("display_name, approval_status, role")
        .eq("id", user.id)
        .maybeSingle();

    if (error || profile?.approval_status !== "approved") {
        redirect("/pendiente");
    }

    return (
        <div className="text-center">
            <p className="mb-5 text-4xl">🏆</p>

            <h1 className="font-serif text-4xl text-[#e6c785]">
                Bienvenido a GoyaAwards
            </h1>

            <p className="mt-6 text-white/70">
                Hola, {profile.display_name}.
            </p>

            <p className="mt-4 text-white/60">
                Tu cuenta fue aprobada correctamente.
                Este es tu primer espacio protegido.
            </p>

            {profile.role === "admin" && (
                <div className="mt-8">
                    <Link
                        href="/admin/solicitudes"
                        className="inline-block rounded-full bg-[#d4af37] px-7 py-3 font-semibold text-black transition hover:bg-[#e6c785]"
                    >
                        Panel de administración
                    </Link>
                </div>
            )}

            <LogoutButton />
        </div>
    );
}

export default function PrivatePage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-6 text-white">
            <div className="max-w-xl rounded-2xl border border-[#d4af37]/25 bg-[#18171b] p-10">
                <Suspense fallback={<p>Verificando acceso...</p>}>
                    <PrivateContent />
                </Suspense>
            </div>
        </main>
    );
}
