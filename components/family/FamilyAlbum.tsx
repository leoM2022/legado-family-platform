import Link from "next/link";
import type { FamilyMember } from "@/types/family";
import type { createClient } from "@/lib/supabase/server";
import FamilyAvatar from "@/components/profile/FamilyAvatar";
import FamilyRail from "@/components/ui/FamilyRail";
import GalaEmptyState from "@/components/ui/GalaEmptyState";
import SplitText from "@/components/ui/SplitText";

export default function FamilyAlbum({ supabase }: { supabase: Awaited<ReturnType<typeof createClient>> }) {
    return (
        <section id="familia" className="scroll-mt-28">
            <header className="gala-family-intro">
                <p className="gala-kicker mb-4">
                    Álbum familiar
                </p>

                <h1 className="font-serif text-[#fff0d3]"><SplitText text="Nuestra familia" /></h1>

                <p className="mx-auto mt-4 max-w-xl text-base text-white/75 sm:text-lg">
                    Conocé los gustos, recuerdos y pequeñas historias que hacen única a nuestra familia.
                </p>
            </header>
            <Directory supabase={supabase} />
        </section>
    );
}

async function Directory({ supabase }: { supabase: Awaited<ReturnType<typeof createClient>> }) {
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
            <GalaEmptyState title="El álbum está por comenzar">
                <p>Todavía no hay perfiles compartidos. Podés compartir el tuyo desde Mi espacio.</p>
                <Link href="/mi-espacio/editar" className="gala-button gala-button--gold">
                    Configurar mi perfil
                </Link>
            </GalaEmptyState>
        );
    }

    return (
        <FamilyRail>
            {members.map((member) => {
                const name =
                    member.nickname || member.display_name;

                return (
                    <Link
                        key={member.user_id}
                        href={`/familia/${member.user_id}`}
                        className="group gala-panel gala-card gala-family-card"
                    >
                        <div className="gala-family-photo">
                            <FamilyAvatar
                                avatarPath={member.avatar_path}
                                name={name}
                                portrait
                                size={640}
                            />
                        </div>

                        <div className="gala-family-caption">
                            <h2 className="font-serif text-[#fff0d3]">
                                {name}
                            </h2>

                            {member.nickname && (
                                <p className="mt-2 text-sm text-white/75">
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

                            <p className="gala-family-profile-link group-hover:underline">
                                Ver perfil
                            </p>
                        </div>
                    </Link>
                );
            })}
        </FamilyRail>
    );
}
