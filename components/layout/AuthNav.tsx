
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function AuthNav() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    // Usuario sin sesión.
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

    const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status, role")
        .eq("id", user.id)
        .maybeSingle();

    const approved =
        profile?.approval_status === "approved";

    const isAdmin =
        approved && profile?.role === "admin";

    const linkClass =
        "rounded-full border border-[#d4af37]/50 px-5 py-2 text-sm text-[#e6c785]";

    return (
        <div className="flex flex-wrap items-center gap-3">
            <Link
                href={approved ? "/mi-espacio" : "/pendiente"}
                prefetch={false}
                className="rounded-full bg-[#d4af37] px-5 py-2 text-sm font-semibold text-black"
            >
                {approved ? "Mi espacio" : "Estado de solicitud"}
            </Link>

            {/* ADMINISTRACIÓN */}
            {isAdmin && (
                <>
                    <Link
                        href="/admin/solicitudes"
                        prefetch={false}
                        className={linkClass}
                    >
                        Administración
                    </Link>

                    <Link
                        href="/admin/premios"
                        prefetch={false}
                        className={linkClass}
                    >
                        Gestionar ternas 🏆
                    </Link>

                    <Link
                        href="/admin/votaciones"
                        prefetch={false}
                        className={linkClass}
                    >
                        Control de votos
                    </Link>
                </>
            )}

            {/* FUNCIONES PARA FAMILIARES APROBADOS */}
            {approved && (
                <>
                    <Link
                        href="/votar"
                        prefetch={false}
                        className={linkClass}
                    >
                        Votar 🗳️
                    </Link>

                    <Link
                        href="/familia"
                        prefetch={false}
                        className={linkClass}
                    >
                        Nuestra familia
                    </Link>

                    <Link
                        href="/cumpleanos"
                        prefetch={false}
                        className={linkClass}
                    >
                        Cumpleaños
                    </Link>

                    <Link
                        href="/comunidad"
                        prefetch={false}
                        className={linkClass}
                    >
                        Comunidad
                    </Link>
                </>
            )}

            <LogoutButton compact />
        </div>
    );
}
