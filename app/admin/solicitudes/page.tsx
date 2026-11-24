
import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import { reviewRegistration } from "./actions";

async function PendingRequests() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // Verificar privilegios de administrador
    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("role, approval_status")
            .eq("id", user.id)
            .single();

    if (
        profileError ||
        profile?.role !== "admin" ||
        profile.approval_status !== "approved"
    ) {
        notFound();
    }

    // Recuperar las solicitudes mediante función segura
    const { data: requests, error } = await supabase.rpc(
        "admin_list_pending_registrations"
    );

    if (error) {
        console.error("Error al cargar solicitudes:", error.message);
        return (
            <p role="alert" className="text-center text-red-400">
                No se pudieron cargar las solicitudes.
            </p>
        );
    }

    const pending = requests ?? [];

    return (
        <section>
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-serif text-2xl">
                    Solicitudes pendientes
                </h2>

                <span className="rounded-full border border-[#d4af37]/40 px-4 py-2 text-sm text-[#e6c785]">
          {pending.length} pendientes
        </span>
            </div>

            {pending.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#18171b] p-12 text-center">
                    <p className="mb-5 text-4xl">✅</p>
                    <h3 className="font-serif text-2xl text-[#e6c785]">
                        Todo al día
                    </h3>
                    <p className="mt-4 text-white/60">
                        No hay solicitudes pendientes de aprobación.
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    {pending.map((request) => (
                        <article
                            key={request.user_id}
                            className="rounded-2xl border border-[#d4af37]/20 bg-[#18171b] p-6"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h3 className="font-serif text-xl text-[#e6c785]">
                                        {request.display_name}
                                    </h3>

                                    <p className="mt-2 break-all text-sm text-white/70">
                                        {request.email}
                                    </p>

                                    <p className="mt-3 text-xs text-white/40">
                                        Solicitud:{" "}
                                        {new Intl.DateTimeFormat("es-AR", {
                                            day: "2-digit",
                                            month: "long",
                                            year: "numeric",
                                        }).format(new Date(request.requested_at))}
                                    </p>
                                </div>

                                <span className="rounded-full bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
                  Pendiente
                </span>
                            </div>

                            <form
                                action={reviewRegistration}
                                className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-6"
                            >
                                <input
                                    type="hidden"
                                    name="userId"
                                    value={request.user_id}
                                />

                                <button
                                    type="submit"
                                    name="decision"
                                    value="approved"
                                    className="rounded-full bg-[#d4af37] px-6 py-3 text-sm font-semibold text-black hover:bg-[#e6c785]"
                                >
                                    Aprobar
                                </button>

                                <button
                                    type="submit"
                                    name="decision"
                                    value="rejected"
                                    className="rounded-full border border-red-400/40 px-6 py-3 text-sm text-red-300 hover:bg-red-400/10"
                                >
                                    Rechazar
                                </button>
                            </form>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

export default function AdminRequestsPage() {
    return (
        <div className="min-h-screen bg-[#0b0b0d] text-[#f7f3e8]">
            <Navbar />

            <main className="mx-auto max-w-5xl px-6 py-16">
                <Link
                    href="/mi-espacio"
                    className="text-sm text-white/50 hover:text-[#e6c785]"
                >
                    ← Volver a mi espacio
                </Link>

                <div className="my-14">
                    <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
                        GoyaAwards · Administración
                    </p>

                    <h1 className="font-serif text-4xl sm:text-6xl">
                        Control de acceso
                    </h1>

                    <p className="mt-6 text-white/60">
                        Revisá y autorizá las solicitudes de ingreso.
                        Solamente el administrador puede tomar decisiones.
                    </p>
                </div>

                <Suspense
                    fallback={
                        <p className="text-center text-[#e6c785]">
                            Cargando solicitudes...
                        </p>
                    }
                >
                    <PendingRequests />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
