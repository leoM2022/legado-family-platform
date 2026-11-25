
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import ProfileEditor, {
    type ProfileData,
} from "@/components/profile/ProfileEditor";

async function EditProfileContent() {
    const supabase = await createClient();

    // Verificar sesión
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // Verificar aprobación
    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("display_name, approval_status")
            .eq("id", user.id)
            .maybeSingle();

    if (profileError) {
        throw new Error("No se pudo consultar tu cuenta.");
    }

    if (profile?.approval_status !== "approved") {
        redirect("/pendiente");
    }

    // Consultar datos personales
    const { data: details, error } = await supabase
        .from("profile_details")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        throw new Error("No se pudo cargar tu perfil.");
    }

    // Valores predeterminados para perfiles nuevos
    const initialProfile: ProfileData = {
        nickname: details?.nickname ?? "",
        birthday_day: details?.birthday_day ?? null,
        birthday_month: details?.birthday_month ?? null,
        current_status: details?.current_status ?? "",
        favorite_food: details?.favorite_food ?? "",
        favorite_color: details?.favorite_color ?? "",
        currently_into: details?.currently_into ?? "",
        show_nickname: details?.show_nickname ?? false,
        show_birthday: details?.show_birthday ?? false,
        show_status: details?.show_status ?? false,
        show_favorites: details?.show_favorites ?? false,
        show_in_directory: details?.show_in_directory ?? false,
    };

    return (
        <>
            <div className="mb-10">
                <p className="text-sm text-white/50">
                    Nombre de cuenta: {profile.display_name}
                </p>
            </div>

            <ProfileEditor initialProfile={initialProfile} />
        </>
    );
}

export default function EditProfilePage() {
    return (
        <main className="min-h-screen bg-[#0b0b0d] px-6 py-16 text-white">
            <div className="mx-auto max-w-3xl">
                <Link
                    href="/mi-espacio"
                    className="text-sm text-white/60 hover:text-[#e6c785]"
                >
                    ← Volver a mi espacio
                </Link>

                <div className="mb-12 mt-10">
                    <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
                        GoyaAwards · Mi perfil
                    </p>

                    <h1 className="font-serif text-4xl text-[#e6c785] sm:text-5xl">
                        Editar mi perfil
                    </h1>

                    <p className="mt-5 text-white/60">
                        Personalizá tus datos y elegí qué compartir
                        con el resto de la familia.
                    </p>
                </div>

                <Suspense
                    fallback={
                        <p className="text-[#e6c785]">
                            Cargando información...
                        </p>
                    }
                >
                    <EditProfileContent />
                </Suspense>
            </div>
        </main>
    );
}
