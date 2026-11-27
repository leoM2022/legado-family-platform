
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function AuthNav() {
    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
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

    const admin =
        approved && profile?.role === "admin";

    const btn =
        "rounded-full border border-[#d4af37]/50 px-5 py-2 text-sm text-[#e6c785]";

    return (
        <div className="flex flex-wrap items-center gap-3">
            <Link
                href={
                    approved ? "/mi-espacio" : "/pendiente"
                }
                prefetch={false}
                className="rounded-full bg-[#d4af37] px-5 py-2 text-sm font-semibold text-black"
            >
                {approved
                    ? "Mi espacio"
                    : "Estado de solicitud"}
            </Link>

            {admin && (
                <>
                    <Link
                        href="/admin/solicitudes"
                        prefetch={false}
                        className={btn}
                    >
                        Administración
                    </Link>

                    <Link
                        href="/admin/premios"
                        prefetch={false}
                        className={btn}
                    >
                        Gestionar ternas 🏆
                    </Link>

                    <Link
                        href="/admin/votaciones"
                        prefetch={false}
                        className={btn}
                    >
                        Control de votos
                    </Link>

                    <Link
                        href="/admin/ceremonia"
                        prefetch={false}
                        className={btn}
                    >
                        Control de gala 🎬
                    </Link>
                </>
            )}

            {approved && (
                <>
                    <Link
                        href="/votar"
                        prefetch={false}
                        className={btn}
                    >
                        Votar 🗳️
                    </Link>

                    <Link
                        href="/ganadores"
                        prefetch={false}
                        className={btn}
                    >
                        Ganadores
                    </Link>

                    <Link
                        href="/familia"
                        prefetch={false}
                        className={btn}
                    >
                        Nuestra familia
                    </Link>

                    <Link
                        href="/cumpleanos"
                        prefetch={false}
                        className={btn}
                    >
                        Cumpleaños
                    </Link>

                    <Link
                        href="/comunidad"
                        prefetch={false}
                        className={btn}
                    >
                        Comunidad
                    </Link>
                </>
            )}

            <LogoutButton compact />
        </div>
    );
}
