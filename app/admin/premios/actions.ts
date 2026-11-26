
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredText(
    formData: FormData,
    key: string,
    max: number
): string {
    const value = formData.get(key);

    if (typeof value !== "string") {
        throw new Error(`Falta el campo ${key}.`);
    }

    const text = value.trim();

    if (text.length < 1 || text.length > max) {
        throw new Error(
            `${key}: debe tener entre 1 y ${max} caracteres.`
        );
    }

    return text;
}

function optionalText(
    formData: FormData,
    key: string,
    max: number
): string {
    const value = formData.get(key);

    if (typeof value !== "string") return "";

    const text = value.trim();

    if (text.length > max) {
        throw new Error(`${key}: texto demasiado largo.`);
    }

    return text;
}

function optionalUUID(
    formData: FormData,
    key: string
): string | null {
    const value = formData.get(key);

    if (value === null || value === "") {
        return null;
    }

    if (typeof value !== "string" || !UUID.test(value)) {
        throw new Error(`${key}: identificador inválido.`);
    }

    return value;
}

function requiredUUID(
    formData: FormData,
    key: string
): string {
    const value = optionalUUID(formData, key);

    if (!value) {
        throw new Error(`Seleccioná ${key}.`);
    }

    return value;
}

function requiredInteger(
    formData: FormData,
    key: string,
    min: number,
    max: number
): number {
    const raw = formData.get(key);

    if (
        typeof raw !== "string" ||
        !/^[0-9]+$/.test(raw)
    ) {
        throw new Error(`${key}: número inválido.`);
    }

    const number = Number(raw);

    if (
        !Number.isSafeInteger(number) ||
        number < min ||
        number > max
    ) {
        throw new Error(`${key}: fuera del rango permitido.`);
    }

    return number;
}

async function getAdminClient() {
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
        .select("role, approval_status")
        .eq("id", user.id)
        .maybeSingle();

    if (
        error ||
        profile?.approval_status !== "approved" ||
        profile.role !== "admin"
    ) {
        throw new Error("Acceso administrativo denegado.");
    }

    return supabase;
}

function refreshAdmin() {
    revalidatePath("/admin/premios");
}

// =====================================================
// 1. GUARDAR EDICIÓN
// =====================================================

export async function saveAwardEdition(
    formData: FormData
) {
    const id = optionalUUID(formData, "id");

    const year = requiredInteger(
        formData,
        "year",
        2020,
        2100
    );

    const title = requiredText(
        formData,
        "title",
        120
    );

    const supabase = await getAdminClient();

    const { error } = await supabase.rpc(
        "admin_family_awards_upsert_edition",
        {
            p_id: id,
            p_year: year,
            p_title: title,
        }
    );

    if (error) {
        console.error("Error al guardar edición:", error.message);
        throw new Error(
            "No se pudo guardar la edición. Revisá si el año ya existe o si la edición está cerrada."
        );
    }

    refreshAdmin();
}

// =====================================================
// 2. GUARDAR CATEGORÍA
// =====================================================

export async function saveAwardCategory(
    formData: FormData
) {
    const id = optionalUUID(formData, "id");

    const editionId = requiredUUID(
        formData,
        "edition_id"
    );

    const slug = requiredText(
        formData,
        "slug",
        80
    ).toLowerCase();

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        throw new Error(
            "El slug debe contener letras minúsculas, números y guiones."
        );
    }

    const title = requiredText(
        formData,
        "title",
        120
    );

    const description = optionalText(
        formData,
        "description",
        500
    );

    const displayOrder = requiredInteger(
        formData,
        "display_order",
        0,
        100000
    );

    const supabase = await getAdminClient();

    const { error } = await supabase.rpc(
        "admin_family_awards_upsert_category",
        {
            p_id: id,
            p_edition_id: editionId,
            p_slug: slug,
            p_title: title,
            p_description: description,
            p_display_order: displayOrder,
        }
    );

    if (error) {
        console.error("Error al guardar categoría:", error.message);
        throw new Error(
            "No se pudo guardar la categoría. Revisá el slug y la edición seleccionada."
        );
    }

    refreshAdmin();
}

// =====================================================
// 3. GUARDAR NOMINADO
// =====================================================

export async function saveAwardNominee(
    formData: FormData
) {
    const id = optionalUUID(formData, "id");

    const categoryId = requiredUUID(
        formData,
        "category_id"
    );

    const title = requiredText(
        formData,
        "title",
        120
    );

    const description = optionalText(
        formData,
        "description",
        500
    );

    const symbol =
        optionalText(formData, "symbol", 12) || "🏆";

    const displayOrder = requiredInteger(
        formData,
        "display_order",
        0,
        100000
    );

    const familyUserId = optionalUUID(
        formData,
        "family_user_id"
    );

    const supabase = await getAdminClient();

    const { error } = await supabase.rpc(
        "admin_family_awards_upsert_nominee",
        {
            p_id: id,
            p_category_id: categoryId,
            p_title: title,
            p_description: description,
            p_symbol: symbol,
            p_display_order: displayOrder,
            p_family_user_id: familyUserId,
        }
    );

    if (error) {
        console.error("Error al guardar nominado:", error.message);
        throw new Error(
            "No se pudo guardar el nominado. Revisá la categoría y el familiar seleccionado."
        );
    }

    refreshAdmin();
}
