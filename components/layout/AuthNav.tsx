
import Link from "next/link";
import { connection } from "next/server";
import AccountMenu from "./AccountMenu";

import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function AuthNav() {
    await connection();
    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return (
            <div className="gala-guest">
                <Link
                    href="/login"
                    prefetch={false}
                    className="gala-button"
                >
                    Iniciar sesión
                </Link>

                <Link
                    href="/registro"
                    prefetch={false}
                    className="gala-button gala-button--gold"
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

    const familyLinks = [
        ["/familia", "Nuestra familia"],
        ["/comunidad", "Comunidad"],
        ["/cumpleanos", "Cumpleaños"],
        ["/votar", "Votar"],
    ];

    const adminLinks = [
        ["/admin/solicitudes", "Solicitudes"],
        ["/admin/premios", "Gestionar ternas"],
        ["/admin/votaciones", "Control de votos"],
        ["/admin/ceremonia", "Consola de gala"],
        ["/ceremonia", "Ceremonia"],
        ["/ganadores", "Ganadores"],
    ];

    return (
        <AccountMenu>
            <Link className="gala-account-home" href={approved ? "/mi-espacio" : "/pendiente"} prefetch={false}>
                {approved ? "Mi espacio" : "Estado de solicitud"}
            </Link>
            {approved && (
                <div className="gala-menu-group">
                    <p className="gala-kicker">Familia y premios</p>
                    {familyLinks.map(([href, label]) => (
                        <Link href={href} key={href} prefetch={false}>{label}</Link>
                    ))}
                </div>
            )}
            {admin && (
                <div className="gala-menu-group">
                    <p className="gala-kicker">Administración</p>
                    {adminLinks.map(([href, label]) => (
                        <Link href={href} key={href} prefetch={false}>{label}</Link>
                    ))}
                </div>
            )}
            <LogoutButton compact />
        </AccountMenu>
    );
}
