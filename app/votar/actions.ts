
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUUID(
    formData: FormData,
    key: string
): string {
    const value = formData.get(key);

    if (
        typeof value !== "string" ||
        !UUID.test(value)
    ) {
        throw new Error(`Identificador inválido: ${key}.`);
    }

    return value;
}

export async function castFamilyVote(
    formData: FormData
) {
    const categoryId = requireUUID(
        formData,
        "category_id"
    );

    const nomineeId = requireUUID(
        formData,
        "nominee_id"
    );

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error("Debés iniciar sesión para votar.");
    }

    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("approval_status")
            .eq("id", user.id)
            .maybeSingle();

    if (
        profileError ||
        profile?.approval_status !== "approved"
    ) {
        throw new Error("Tu cuenta no está aprobada.");
    }

    const { error } = await supabase.rpc(
        "family_awards_cast_vote",
        {
            p_category_id: categoryId,
            p_nominee_id: nomineeId,
        }
    );

    if (error) {
        console.error(
            "Error al registrar voto:",
            error.message
        );

        throw new Error(
            "No se pudo registrar el voto. Puede que ya hayas votado o que la votación haya finalizado."
        );
    }

    revalidatePath("/votar");
}
