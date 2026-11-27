
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{4}[0-9a-f]{8}$/i;

function getEditionId(formData: FormData): string {
    const value = formData.get("edition_id");

    if (typeof value !== "string" || !UUID.test(value)) {
        throw new Error("Identificador de edición inválido.");
    }

    return value;
}

function parseJujuyDate(
    formData: FormData,
    field: string
): string {
    const value = formData.get(field);

    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ) {
        throw new Error(`Fecha inválida: ${field}.`);
    }

    // El formulario usa hora de Jujuy (UTC-3).
    const date = new Date(`${value}:00-03:00`);

    if (Number.isNaN(date.getTime())) {
        throw new Error(`Fecha inválida: ${field}.`);
    }

    return date.toISOString();
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
        .select("approval_status, role")
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

function refreshVoting() {
    revalidatePath("/admin/votaciones");
    revalidatePath("/admin/premios");
    revalidatePath("/votar");
}

// ==========================================
// 1. GUARDAR FECHAS
// ==========================================

export async function saveVotingSchedule(
    formData: FormData
) {
    const editionId = getEditionId(formData);

    const startsAt = parseJujuyDate(
        formData,
        "starts_at"
    );

    const endsAt = parseJujuyDate(
        formData,
        "ends_at"
    );

    if (new Date(startsAt) >= new Date(endsAt)) {
        throw new Error(
            "El cierre debe ser posterior al inicio."
        );
    }

    const supabase = await getAdminClient();

    const { error } = await supabase.rpc(
        "admin_family_awards_set_voting_dates",
        {
            p_edition_id: editionId,
            p_starts_at: startsAt,
            p_ends_at: endsAt,
        }
    );

    if (error) {
        console.error(
            "Error al guardar fechas:",
            error.message
        );
        throw new Error(
            "No se pudieron guardar las fechas."
        );
    }

    refreshVoting();
}

// ==========================================
// 2. HABILITAR VOTACIÓN
// ==========================================

export async function openFamilyVoting(
    formData: FormData
) {
    const editionId = getEditionId(formData);
    const supabase = await getAdminClient();

    const { error } = await supabase.rpc(
        "admin_family_awards_open_voting",
        { p_edition_id: editionId }
    );

    if (error) {
        console.error(
            "Error al habilitar votación:",
            error.message
        );
        throw new Error(
            "No se pudo habilitar. Verificá las fechas y que cada terna tenga al menos dos nominados."
        );
    }

    refreshVoting();
}

// ==========================================
// 3. CERRAR VOTACIÓN
// ==========================================

export async function closeFamilyVoting(
    formData: FormData
) {
    const editionId = getEditionId(formData);
    const supabase = await getAdminClient();

    const { error } = await supabase.rpc(
        "admin_family_awards_close_voting",
        { p_edition_id: editionId }
    );

    if (error) {
        console.error(
            "Error al cerrar votación:",
            error.message
        );
        throw new Error("No se pudo cerrar la votación.");
    }

    refreshVoting();
}
