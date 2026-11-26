
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TargetKind = "post" | "comment";

// Verificar usuario y aprobación.
async function getApprovedUser() {
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
        profile?.approval_status !== "approved"
    ) {
        throw new Error("Tu cuenta no está aprobada.");
    }

    return {
        supabase,
        user,
        role: profile.role,
    };
}

// Validar identificadores.
function requireUUID(
    value: FormDataEntryValue | null
): string {
    if (
        typeof value !== "string" ||
        !UUID_PATTERN.test(value)
    ) {
        throw new Error("Identificador inválido.");
    }

    return value;
}

// Identificar publicación o comentario.
function requireTarget(
    formData: FormData
): {
    kind: TargetKind;
    id: string;
} {
    const kind = formData.get("kind");

    if (
        kind !== "post" &&
        kind !== "comment"
    ) {
        throw new Error("Tipo de contenido inválido.");
    }

    return {
        kind,
        id: requireUUID(formData.get("id")),
    };
}

// Validar texto recibido del formulario.
function requireContent(
    value: FormDataEntryValue | null,
    maxLength: number
): string {
    if (typeof value !== "string") {
        throw new Error("El contenido es inválido.");
    }

    const content = value.trim();

    if (
        content.length < 1 ||
        content.length > maxLength
    ) {
        throw new Error(
            `El texto debe tener entre 1 y ${maxLength} caracteres.`
        );
    }

    return content;
}

// ==========================================
// 1. PUBLICAR TEXTO
// ==========================================

export async function createPost(
    formData: FormData
) {
    const content = requireContent(
        formData.get("content"),
        1200
    );

    const { supabase, user } = await getApprovedUser();

    const { error } = await supabase
        .from("family_posts")
        .insert({
            author_id: user.id,
            content,
        });

    if (error) {
        console.error(
            "Error al publicar:",
            error.message
        );

        throw new Error(
            "No se pudo guardar la publicación."
        );
    }

    revalidatePath("/comunidad");
}

// ==========================================
// 2. ELIMINAR PUBLICACIÓN PROPIA
// ==========================================

export async function deletePost(
    formData: FormData
) {
    const postId = requireUUID(
        formData.get("postId")
    );

    const { supabase, user } = await getApprovedUser();

    // Recuperar la ruta de la foto antes de borrar.
    const {
        data: original,
        error: readError,
    } = await supabase
        .from("family_posts")
        .select("image_path")
        .eq("id", postId)
        .eq("author_id", user.id)
        .maybeSingle();

    if (readError) {
        throw new Error(
            "No se pudo consultar la publicación."
        );
    }

    // Eliminar la publicación.
    const { error } = await supabase
        .from("family_posts")
        .delete()
        .eq("id", postId)
        .eq("author_id", user.id);

    if (error) {
        console.error(
            "Error al eliminar publicación:",
            error.message
        );

        throw new Error(
            "No se pudo eliminar la publicación."
        );
    }

    // Limpiar el archivo de Storage si tenía imagen.
    if (original?.image_path) {
        const { error: cleanupError } =
            await supabase.storage
                .from("family-post-images")
                .remove([original.image_path]);

        if (cleanupError) {
            console.error(
                "Imagen pendiente de limpieza:",
                cleanupError.message
            );
        }
    }

    revalidatePath("/comunidad");
}

// ==========================================
// 3. CREAR COMENTARIO
// ==========================================

export async function createComment(
    formData: FormData
) {
    const postId = requireUUID(
        formData.get("postId")
    );

    const content = requireContent(
        formData.get("content"),
        500
    );

    const { supabase, user } = await getApprovedUser();

    const { error } = await supabase
        .from("family_post_comments")
        .insert({
            post_id: postId,
            author_id: user.id,
            content,
        });

    if (error) {
        console.error(
            "Error al crear comentario:",
            error.message
        );

        throw new Error(
            "No se pudo publicar el comentario."
        );
    }

    revalidatePath("/comunidad");
}

// ==========================================
// 4. ELIMINAR COMENTARIO PROPIO
// ==========================================

export async function deleteComment(
    formData: FormData
) {
    const commentId = requireUUID(
        formData.get("commentId")
    );

    const { supabase, user } = await getApprovedUser();

    const { error } = await supabase
        .from("family_post_comments")
        .delete()
        .eq("id", commentId)
        .eq("author_id", user.id);

    if (error) {
        console.error(
            "Error al eliminar comentario:",
            error.message
        );

        throw new Error(
            "No se pudo eliminar el comentario."
        );
    }

    revalidatePath("/comunidad");
}

// ==========================================
// 5. REACCIONAR A UNA PUBLICACIÓN
// ==========================================

export async function reactToPost(
    formData: FormData
) {
    const postId = requireUUID(
        formData.get("postId")
    );

    const reaction = formData.get("reaction");

    if (
        reaction !== "like" &&
        reaction !== "love" &&
        reaction !== "laugh"
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
        console.error(
            "Error al reaccionar:",
            error.message
        );

        throw new Error(
            "No se pudo guardar la reacción."
        );
    }

    revalidatePath("/comunidad");
}

// ==========================================
// 6. QUITAR UNA REACCIÓN
// ==========================================

export async function removeReaction(
    formData: FormData
) {
    const postId = requireUUID(
        formData.get("postId")
    );

    const { supabase, user } = await getApprovedUser();

    const { error } = await supabase
        .from("family_post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

    if (error) {
        console.error(
            "Error al quitar reacción:",
            error.message
        );

        throw new Error(
            "No se pudo quitar la reacción."
        );
    }

    revalidatePath("/comunidad");
}

// ==========================================
// 7. EDITAR PUBLICACIÓN O COMENTARIO
// ==========================================

export async function editFamilyContent(
    formData: FormData
) {
    const { kind, id } = requireTarget(formData);

    const content = requireContent(
        formData.get("content"),
        kind === "post" ? 1200 : 500
    );

    const { supabase } = await getApprovedUser();

    const { error } = await supabase.rpc(
        "edit_family_content",
        {
            p_kind: kind,
            p_id: id,
            p_content: content,
        }
    );

    if (error) {
        console.error(
            "Error al editar contenido:",
            error.message
        );

        throw new Error(
            "No se pudo editar. Comprobá tus permisos."
        );
    }

    revalidatePath("/comunidad");
}

// ==========================================
// 8. MODERAR CONTENIDO
// ==========================================

export async function moderateFamilyContent(
    formData: FormData
) {
    const { kind, id } = requireTarget(formData);

    const reason = formData.get("reason");

    if (
        typeof reason !== "string" ||
        reason.trim().length < 5 ||
        reason.trim().length > 200
    ) {
        throw new Error(
            "El motivo debe tener entre 5 y 200 caracteres."
        );
    }

    const { supabase, role } = await getApprovedUser();

    if (role !== "admin") {
        throw new Error("Acceso no autorizado.");
    }

    // Consultar ruta de la fotografía si se retira un post.
    let imagePath: string | null = null;

    if (kind === "post") {
        const {
            data,
            error: imageError,
        } = await supabase.rpc(
            "admin_get_post_image_path",
            {
                p_post_id: id,
            }
        );

        if (imageError) {
            throw new Error(
                "No se pudo verificar la imagen del post."
            );
        }

        imagePath = data as string | null;
    }

    // Moderar y registrar el motivo.
    const { error } = await supabase.rpc(
        "moderate_family_content",
        {
            p_kind: kind,
            p_id: id,
            p_reason: reason.trim(),
        }
    );

    if (error) {
        console.error(
            "Error al moderar contenido:",
            error.message
        );

        throw new Error(
            "No se pudo moderar el contenido."
        );
    }

    // Si había foto, solicitar su eliminación.
    if (imagePath) {
        const { error: cleanupError } =
            await supabase.storage
                .from("family-post-images")
                .remove([imagePath]);

        if (cleanupError) {
            console.error(
                "Imagen moderada pendiente de limpieza:",
                cleanupError.message
            );
        }
    }

    revalidatePath("/comunidad");
}
