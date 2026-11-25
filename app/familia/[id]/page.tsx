import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import type { FamilyMember } from "@/types/family";
import FamilyAvatar from "@/components/profile/FamilyAvatar";

const months = [
    "enero", "febrero", "marzo", "abril",
    "mayo", "junio", "julio", "agosto",
    "septiembre", "octubre", "noviembre", "diciembre",
];

async function MemberProfile({
                                 params,
                             }: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
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
        throw new Error("No se pudo verificar tu cuenta.");
    }

    if (profile?.approval_status !== "approved") {
        redirect("/pendiente");
    }

    const { data, error } = await supabase.rpc(
        "get_family_directory"
    );

    if (error) {
        throw new Error("No se pudo consultar el perfil.");
    }

    const members = (data ?? []) as FamilyMember[];
    const member = members.find(
        (item) => item.user_id === id
    );

    if (!member) {
        notFound();
    }

    const name = member.nickname || member.display_name;

    const birthday =
        member.birthday_day && member.birthday_month
            ? `${member.birthday_day} de ${
                months[member.birthday_month - 1]
            }`
            : null;

    const visibleDetails = [
        { label: "Cumpleaños", value: birthday },
        { label: "Estado actual", value: member.current_status },
        { label: "Comida favorita", value: member.favorite_food },
        { label: "Color favorito", value: member.favorite_color },
        { label: "En qué ando hoy", value: member.currently_into },
    ].filter((item) => item.value);

    return (
        <article className="mx-auto max-w-2xl">
            <div className="rounded-3xl border border-[#d4af37]/20 bg-[#18171b] p-8 sm:p-12">
                <div className="text-center">
                    <div className="mb-6">
                        <FamilyAvatar
                            avatarPath={member.avatar_path}
                            name={name}
                            size={112}
                        />
                    </div>

                    <h1 className="font-serif text-4xl text-[#e6c785]">
                        {name}
                    </h1>

                    {member.nickname && (
                        <p className="mt-3 text-white/50">
                            {member.display_name}
                        </p>
                    )}
                </div>

                <div className="mt-10 border-t border-white/10 pt-8">
                    <h2 className="mb-6 font-serif text-2xl text-white">
                        Sobre mí
                    </h2>

                    {visibleDetails.length === 0 ? (
                        <p className="text-white/50">
                            Este familiar todavía no compartió
                            información adicional.
                        </p>
                    ) : (
                        <dl className="space-y-6">
                            {visibleDetails.map((item) => (
                                <div key={item.label}>
                                    <dt className="mb-2 text-xs uppercase tracking-wider text-[#d4af37]">
                                        {item.label}
                                    </dt>

                                    <dd className="text-white/80">
                                        {item.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </div>

                {user.id === member.user_id && (
                    <Link
                        href="/mi-espacio/editar"
                        className="mt-10 inline-block rounded-full border border-[#d4af37] px-6 py-3 text-sm text-[#e6c785]"
                    >
                        Editar mi perfil
                    </Link>
                )}
            </div>
        </article>
    );
}

export default function FamilyMemberPage({
                                             params,
                                         }: {
    params: Promise<{ id: string }>;
}) {
    return (
        <div className="min-h-screen bg-[#0b0b0d] text-white">
            <Navbar />

            <main className="px-6 py-16">
                <div className="mx-auto mb-10 max-w-2xl">
                    <Link
                        href="/familia"
                        className="text-sm text-white/60 hover:text-[#e6c785]"
                    >
                        ← Volver a la familia
                    </Link>
                </div>

                <Suspense
                    fallback={
                        <p className="text-center text-[#e6c785]">
                            Cargando perfil...
                        </p>
                    }
                >
                    <MemberProfile params={params} />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
