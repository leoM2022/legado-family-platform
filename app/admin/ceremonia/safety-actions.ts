
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function setCeremonyPaused(
    editionId: string,
    paused: boolean
): Promise<void> {
    if (!UUID.test(editionId) || typeof paused !== "boolean") {
        throw new Error("Datos de ceremonia inválidos.");
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error("Debés iniciar sesión.");
    }

    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("approval_status, role")
            .eq("id", user.id)
            .maybeSingle();

    if (
        profileError ||
        profile?.approval_status !== "approved" ||
        profile.role !== "admin"
    ) {
        throw new Error("Solo el administrador puede controlar la gala.");
    }

    const { error } = await supabase.rpc(
        "admin_ceremony_set_paused",
        {
            p_edition_id: editionId,
            p_paused: paused,
        }
    );

    if (error) {
        console.error("Error al pausar ceremonia:", error.message);

        throw new Error("No se pudo cambiar el estado de la ceremonia.");
    }

    revalidatePath("/admin/ceremonia");
    revalidatePath("/ceremonia");
}
