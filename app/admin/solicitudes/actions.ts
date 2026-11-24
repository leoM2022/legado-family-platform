
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reviewRegistration(formData: FormData) {
    const userId = formData.get("userId");
    const decision = formData.get("decision");

    if (
        typeof userId !== "string" ||
        typeof decision !== "string" ||
        !["approved", "rejected"].includes(decision)
    ) {
        throw new Error("Solicitud inválida.");
    }

    const supabase = await createClient();

    // Comprobar la identidad desde el servidor
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error("Debés iniciar sesión.");
    }

    // Comprobar que sea administrador
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
        throw new Error("Acceso no autorizado.");
    }

    // PostgreSQL vuelve a verificar los permisos
    const { error } = await supabase.rpc(
        "admin_review_registration",
        {
            p_user_id: userId,
            p_decision: decision,
        }
    );

    if (error) {
        console.error("Error al revisar solicitud:", error.message);
        throw new Error("No se pudo procesar la solicitud.");
    }

    revalidatePath("/admin/solicitudes");
}
