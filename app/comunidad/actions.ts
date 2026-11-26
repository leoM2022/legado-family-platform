
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getApprovedUser() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error("Debés iniciar sesión.");
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("approval_status, role")
        .eq("id", user.id)
        .single();

    if (error || profile.approval_status !== "approved") {
        throw new Error("Tu cuenta no está aprobada.");
    }

    return { supabase, user, role: profile.role };
}

export async function createPost(formData: FormData) {
    const content = formData.get("content");

    if (
        typeof content !== "string" ||
        content.trim().length < 1 ||
        content.trim().length > 1200
    ) {
        throw new Error(
            "La publicación debe tener entre 1 y 1200 caracteres."
        );
    }

    const { supabase, user } = await getApprovedUser();

    const { error } = await supabase
        .from("family_posts")
        .insert({
            author_id: user.id,
            content: content.trim(),
        });

    if (error) {
        console.error("Error al publicar:", error.message);
        throw new Error("No se pudo guardar la publicación.");
    }

    revalidatePath("/comunidad");
}

export async function deletePost(formData: FormData) {
    const postId = formData.get("postId");

    if (
        typeof postId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId)
    ) {
        throw new Error("Identificador inválido.");
    }

    const { supabase, user } = await getApprovedUser();

    const { error } = await supabase
        .from("family_posts")
        .delete()
        .eq("id", postId)
        .eq("author_id", user.id);

    if (error) {
        console.error("Error al eliminar:", error.message);
        throw new Error("No se pudo eliminar la publicación.");
    }

    revalidatePath("/comunidad");
}


export async function createComment(formData: FormData) {
    const postId = formData.get("postId");
    const content = formData.get("content");

    if (
        typeof postId !== "string" ||
        typeof content !== "string" ||
        content.trim().length < 1 ||
        content.trim().length > 500
    ) {
        throw new Error("Comentario inválido.");
    }

    const { supabase, user } = await getApprovedUser();

    const { error } = await supabase
        .from("family_post_comments")
        .insert({
            post_id: postId,
            author_id: user.id,
            content: content.trim(),
        });

    if (error) {
        console.error("Error al comentar:", error.message);
        throw new Error("No se pudo publicar el comentario.");
    }

    revalidatePath("/comunidad");
}

export async function deleteComment(formData: FormData) {
    const commentId = formData.get("commentId");

    if (typeof commentId !== "string") {
        throw new Error("Comentario inválido.");
    }

    const { supabase, user } = await getApprovedUser();

    const { error } = await supabase
        .from("family_post_comments")
        .delete()
        .eq("id", commentId)
        .eq("author_id", user.id);

    if (error) {
        throw new Error("No se pudo eliminar el comentario.");
    }

    revalidatePath("/comunidad");
}

export async function reactToPost(formData: FormData) {
    const postId = formData.get("postId");
    const reaction = formData.get("reaction");

    const allowed = ["like", "love", "laugh"];

    if (
        typeof postId !== "string" ||
        typeof reaction !== "string" ||
        !allowed.includes(reaction)
    ) {
        throw new Error("Reacción inválida.");
    }

    const { supabase, user } = await getApprovedUser();

    const { error } = await supabase
        .from("family_post_reactions")
        .upsert(
            {
                post_id: postId,
                user_id: user.id,
                reaction_type: reaction,
            },
            {
                onConflict: "post_id,user_id",
            }
        );

    if (error) {
        console.error("Error al reaccionar:", error.message);
        throw new Error("No se pudo guardar la reacción.");
    }

    revalidatePath("/comunidad");
}

export async function removeReaction(formData: FormData) {
    const postId = formData.get("postId");

    if (
        typeof postId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId)
    ) {
        throw new Error("Publicación inválida.");
    }

    const { supabase, user } = await getApprovedUser();

    const { error } = await supabase
        .from("family_post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

    if (error) {
        console.error("Error al quitar reacción:", error.message);
        throw new Error("No se pudo quitar la reacción.");
    }

    revalidatePath("/comunidad");
}

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseContentTarget(formData: FormData) {
    const kind = formData.get("kind");
    const id = formData.get("id");

    if (
        (kind !== "post" && kind !== "comment") ||
        typeof id !== "string" ||
        !UUID_PATTERN.test(id)
    ) {
        throw new Error("Contenido inválido.");
    }

    return { kind, id };
}

// Editar contenido propio
export async function editFamilyContent(
    formData: FormData
) {
    const { kind, id } = parseContentTarget(formData);
    const content = formData.get("content");

    const maxLength = kind === "post" ? 1200 : 500;

    if (
        typeof content !== "string" ||
        content.trim().length < 1 ||
        content.trim().length > maxLength
    ) {
        throw new Error("El texto no cumple los límites.");
    }

    const { supabase } = await getApprovedUser();

    const { error } = await supabase.rpc(
        "edit_family_content",
        {
            p_kind: kind,
            p_id: id,
            p_content: content.trim(),
        }
    );

    if (error) {
        console.error("Error al editar:", error.message);
        throw new Error(
            "No se pudo editar el contenido. Comprobá tus permisos."
        );
    }

    revalidatePath("/comunidad");
}

// Retirar contenido desde administración
export async function moderateFamilyContent(
    formData: FormData
) {
    const { kind, id } = parseContentTarget(formData);
    const reason = formData.get("reason");

    if (
        typeof reason !== "string" ||
        reason.trim().length < 5 ||
        reason.trim().length > 200
    ) {
        throw new Error(
            "Ingresá un motivo de entre 5 y 200 caracteres."
        );
    }

    const { supabase, role } = await getApprovedUser();

    if (role !== "admin") {
        throw new Error("Acceso no autorizado.");
    }

    // La función SQL comprueba nuevamente el rol.
    const { error } = await supabase.rpc(
        "moderate_family_content",
        {
            p_kind: kind,
            p_id: id,
            p_reason: reason.trim(),
        }
    );

    if (error) {
        console.error("Error de moderación:", error.message);
        throw new Error("No se pudo moderar el contenido.");
    }

    revalidatePath("/comunidad");
}


