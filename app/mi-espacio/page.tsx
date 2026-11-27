
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FamilyAvatar from "@/components/profile/FamilyAvatar";
import FamilyMoments from "@/components/profile/FamilyMoments";
import SplitText from "@/components/ui/SplitText";
import Link from "next/link";

async function PrivateContent() {
    await connection();
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

    const { data: details, error: detailsError } = await supabase
        .from("profile_details")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    const birthday = details?.birthday_day && details?.birthday_month
        ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: "UTC" })
            .format(new Date(Date.UTC(2000, details.birthday_month - 1, details.birthday_day)))
        : null;

    return (
        <>
            <header className="gala-dashboard-hero">
                <div className="gala-dashboard-portrait">
                    <FamilyAvatar avatarPath={details?.avatar_path ?? null} name={profile.display_name} size={132} />
                </div>
                <div className="min-w-0">
                    <p className="gala-kicker mb-3">Mi espacio</p>
                    <h1><SplitText text={profile.display_name} /></h1>
                    {details?.nickname && <p className="mt-2 font-serif text-2xl italic text-[#e6c785]">«{details.nickname}»</p>}
                    <Link href="/mi-espacio/editar" prefetch={false} className="gala-button gala-button--gold mt-6">
                        Editar mi perfil
                    </Link>
                </div>
            </header>
            <div className="gala-dashboard-grid">
                <section className="gala-panel gala-dashboard-story">
                    <p className="gala-kicker">Perfil personal</p>
                    <h2 className="mt-2 font-serif text-4xl">En qué ando</h2>
                    {detailsError ? (
                        <p role="alert" className="mt-4">No pudimos cargar tus datos personales.</p>
                    ) : (
                        <>
                            <p className="mt-4 whitespace-pre-wrap wrap-break-word font-serif text-xl text-white/80">
                                {details?.currently_into || "Podés contar en tu perfil qué estás haciendo últimamente."}
                            </p>
                            {details?.current_status && <p className="gala-status-chip mt-5">{details.current_status}</p>}
                        </>
                    )}
                </section>
                {!detailsError && (
                    <section className="gala-panel gala-dashboard-facts">
                        <h2 className="font-serif text-3xl">Mis detalles</h2>
                        <dl className="gala-dashboard-list">
                            {[
                                ["Cumpleaños", birthday],
                                ["Comida favorita", details?.favorite_food],
                                ["Color favorito", details?.favorite_color],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <dt>{label}</dt>
                                    <dd>{value || "Sin completar"}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                )}
                <nav aria-label="Accesos de mi espacio" className="gala-dashboard-links">
                    <Link href="/comunidad">Compartir un recuerdo</Link>
                    <Link href="/cumpleanos">Ver cumpleaños</Link>
                    <Link href="/votar">Ir a las votaciones</Link>
                    {profile.role === "admin" && <Link href="/admin/solicitudes">Panel de administración</Link>}
                </nav>
            </div>
            <Suspense fallback={<p className="mt-8">Cargando publicaciones…</p>}>
                <FamilyMoments authorId={user.id} own />
            </Suspense>
        </>
    );
}

export default function PrivatePage() {
    return (
        <div className="gala-room">
            <Navbar />
            <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
                <Suspense fallback={<p>Verificando acceso…</p>}>
                    <PrivateContent />
                </Suspense>
            </main>
            <Footer />
        </div>
    );
}
