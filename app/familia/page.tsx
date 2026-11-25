import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import type { FamilyMember } from "@/types/family";
import FamilyAvatar from "@/components/profile/FamilyAvatar";

async function FamilyDirectory() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("approval_status")
            .eq("id", user.id)
            .maybeSingle();

    if (profileError) {
        throw new Error("No pudimos verificar tu cuenta.");
    }

    if (profile?.approval_status !== "approved") {
        redirect("/pendiente");
    }

    const { data, error } = await supabase.rpc(
        "get_family_directory"
    );

    if (error) {
        console.error("Error del directorio:", error.message);

        return (
            <p role="alert" className="text-red-400">
                No pudimos cargar los perfiles familiares.
            </p>
        );
    }

    const members = (data ?? []) as FamilyMember[];

    if (members.length === 0) {
        return (
            <div className="rounded-2xl border border-white/10 bg-[#18171b] p-10 text-center">
                <p className="mb-5 text-4xl">🏠</p>

                <h2 className="font-serif text-2xl text-[#e6c785]">
                    Nuestra comunidad está comenzando
                </h2>

                <p className="mt-4 text-white/60">
                    Todavía no hay perfiles compartidos.
                    Podés activar el tuyo desde Mi espacio.
                </p>

                <Link
                    href="/mi-espacio/editar"
                    className="mt-7 inline-block rounded-full bg-[#d4af37] px-6 py-3 font-semibold text-black"
                >
                    Configurar mi perfil
                </Link>
            </div>
        );
    }

    return (
        <>
            <p className="mb-8 text-sm text-white/50">
                {members.length} perfiles compartidos
            </p>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((member) => {
                    const name =
                        member.nickname || member.display_name;

                    return (
                        <Link
                            key={member.user_id}
                            href={`/familia/${member.user_id}`}
                            className="group rounded-2xl border border-[#d4af37]/20 bg-[#18171b] p-8 text-center transition hover:border-[#d4af37]/70 hover:bg-[#211d1b]"
                        >
                            <div className="mb-6">
                                <FamilyAvatar
                                    avatarPath={member.avatar_path}
                                    name={name}
                                    size={96}
                                />
                            </div>

                            <h2 className="font-serif text-2xl text-[#e6c785]">
                                {name}
                            </h2>

                            {member.nickname && (
                                <p className="mt-2 text-xs text-white/40">
                                    {member.display_name}
                                </p>
                            )}

                            {member.current_status && (
                                <p className="mt-4 text-sm text-white/60">
                                    {member.current_status}
                                </p>
                            )}

                            <p className="mt-6 text-sm text-[#e6c785] group-hover:underline">
                                Visitar perfil →
                            </p>
                        </Link>
                    );
                })}
            </div>
        </>
    );
}

export default function FamilyPage() {
    return (
        <div className="min-h-screen bg-[#0b0b0d] text-white">
            <Navbar />

            <main className="mx-auto max-w-7xl px-6 py-20">
                <header className="mb-14 text-center">
                    <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
                        Comunidad GoyaAwards
                    </p>

                    <h1 className="font-serif text-5xl text-[#e6c785] sm:text-6xl">
                        Nuestra familia
                    </h1>

                    <p className="mt-6 text-white/60">
                        Un lugar para conocernos y compartir
                        nuestras historias.
                    </p>
                </header>

                <Suspense
                    fallback={
                        <p className="text-center text-[#e6c785]">
                            Cargando familia...
                        </p>
                    }
                >
                    <FamilyDirectory />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
