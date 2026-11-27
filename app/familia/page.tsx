import FamilyRail from "@/components/ui/FamilyRail";
import SplitText from "@/components/ui/SplitText";
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
            <div className="gala-panel gala-card p-10 text-center">
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

            <FamilyRail>
                {members.map((member) => {
                    const name =
                        member.nickname || member.display_name;

                    return (
                        <Link
                            key={member.user_id}
                            href={`/familia/${member.user_id}`}
                            className="group gala-panel gala-card p-8 text-center transition hover:border-[#d4af37]/70 hover:bg-[#211d1b]"
                        >
                            <div className="gala-family-photo">
                                <FamilyAvatar
                                    avatarPath={member.avatar_path}
                                    name={name}
                                    portrait
                                    size={640}
                                />
                            </div>

                            <div className="p-6">
                                <h2 className="font-serif text-2xl text-[#e6c785]">
                                    {name}
                                </h2>

                                {member.nickname && (
                                    <p className="mt-2 text-sm text-white/65">
                                        {member.display_name}
                                    </p>
                                )}

                                {member.current_status && (
                                    <p className="mt-4 text-sm text-white/60">
                                        {member.current_status}
                                    </p>
                                )}

                                {member.birthday_day && member.birthday_month && (
                                    <p className="mt-3 text-sm text-white/75">
                                        Cumpleaños · {member.birthday_day}/{member.birthday_month}
                                    </p>
                                )}

                                <p className="mt-6 text-sm text-[#e6c785] group-hover:underline">
                                    Ver perfil
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </FamilyRail>
        </>
    );
}

export default function FamilyPage() {
    return (
        <div className="gala-room">
            <Navbar />

            <main className="mx-auto max-w-7xl px-6 py-20">
                <header className="gala-family-intro">
                    <p className="gala-kicker mb-4">
                        Álbum familiar
                    </p>

                    <h1 className="font-serif text-[#fff0d3]"><SplitText text="Nuestra familia" /></h1>

                    <p className="mt-4 max-w-xl text-lg text-white/75">
                        Conocé los gustos, recuerdos y pequeñas historias que hacen única a nuestra familia.
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
