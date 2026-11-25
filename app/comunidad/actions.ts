
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
        .select("approval_status")
        .eq("id", user.id)
        .single();

    if (error || profile.approval_status !== "approved") {
        throw new Error("Tu cuenta no está aprobada.");
    }

    return { supabase, user };
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


