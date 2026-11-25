
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function AuthNav() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    // Visitante sin sesión
    if (authError || !user) {
        return (
            <div className="flex items-center gap-3">
                <Link
                    href="/login"
                    prefetch={false}
                    className="rounded-full border border-[#d4af37]/50 px-5 py-2 text-sm text-[#e6c785]"
                >
                    Iniciar sesión
                </Link>

                <Link
                    href="/registro"
                    prefetch={false}
                    className="rounded-full bg-[#d4af37] px-5 py-2 text-sm font-semibold text-black"
                >
                    Registrarse
                </Link>
            </div>
        );
    }

    // Consultar el perfil del usuario
    const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status, role")
        .eq("id", user.id)
        .maybeSingle();

    const approved = profile?.approval_status === "approved";
    const isAdmin = approved && profile?.role === "admin";

    return (
        <div className="flex flex-wrap items-center gap-3">
            <Link
                href={approved ? "/mi-espacio" : "/pendiente"}
                prefetch={false}
                className="rounded-full bg-[#d4af37] px-5 py-2 text-sm font-semibold text-black"
            >
                {approved ? "Mi espacio" : "Estado de solicitud"}
            </Link>

            {isAdmin && (
                <Link
                    href="/admin/solicitudes"
                    prefetch={false}
                    className="rounded-full border border-[#d4af37]/50 px-5 py-2 text-sm text-[#e6c785]"
                >
                    Administración
                </Link>
            )}

            {approved && (
                <Link
                    href="/cumpleanos"
                    prefetch={false}
                    className="rounded-full border border-[#d4af37]/50 px-5 py-2 text-sm text-[#e6c785]"
                >
                    Cumpleaños
                </Link>
            )}

            <LogoutButton compact />
        </div>
    );
}
