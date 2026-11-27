
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function id(
    form: FormData,
    key: string,
    optional = false
): string | null {
    const value = form.get(key);

    if (optional && (value === "" || value === null)) {
        return null;
    }

    if (
        typeof value !== "string" ||
        !UUID.test(value)
    ) {
        throw new Error(`Identificador inválido: ${key}`);
    }

    return value;
}

function text(
    form: FormData,
    key: string,
    max: number,
    min = 0
): string {
    const value = form.get(key);

    if (
        typeof value !== "string" ||
        value.trim().length < min ||
        value.trim().length > max
    ) {
        throw new Error(`Texto inválido: ${key}`);
    }

    return value.trim();
}

async function admin() {
    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        throw new Error("Debés iniciar sesión");
    }

    const result = await supabase
        .from("profiles")
        .select("role, approval_status")
        .eq("id", user.id)
        .maybeSingle();

    if (
        result.error ||
        result.data?.role !== "admin" ||
        result.data.approval_status !== "approved"
    ) {
        throw new Error("Acceso no autorizado");
    }

    return supabase;
}

function refresh() {
    revalidatePath("/admin/ceremonia");
    revalidatePath("/ceremonia");
}

export async function prepareCeremony(form: FormData) {
    const editionId = id(form, "edition_id");
    const supabase = await admin();

    const { error } = await supabase.rpc(
        "admin_ceremony_prepare",
        {
            p_edition_id: editionId,
        }
    );

    if (error) {
        throw new Error(
            `No se pudo preparar el recuento: ${error.message}`
        );
    }

    refresh();
}

export async function resolveCeremonyTie(
    form: FormData
) {
    const categoryId = id(form, "category_id");
    const nomineeId = id(form, "nominee_id");
    const reason = text(form, "reason", 300, 10);

    const supabase = await admin();

    const { error } = await supabase.rpc(
        "admin_ceremony_resolve_tie",
        {
            p_category_id: categoryId,
            p_nominee_id: nomineeId,
            p_reason: reason,
        }
    );

    if (error) {
        throw new Error(
            `No se pudo resolver el empate: ${error.message}`
        );
    }

    refresh();
}

export async function saveCeremonyMedia(
    form: FormData
) {
    const categoryId = id(form, "category_id");
    const intro = text(form, "intro_script", 1200);
    const winner = text(form, "winner_script", 800);
    const path = text(form, "video_path", 200);

    const supabase = await admin();

    const { error } = await supabase.rpc(
        "admin_ceremony_set_media",
        {
            p_category_id: categoryId,
            p_intro: intro,
            p_winner_text: winner,
            p_video_path: path || null,
        }
    );

    if (error) {
        throw new Error(
            `No se pudieron guardar los medios: ${error.message}`
        );
    }

    refresh();
}

export async function controlCeremony(
    form: FormData
) {
    const editionId = id(form, "edition_id");
    const categoryId = id(
        form,
        "category_id",
        true
    );

    const command = form.get("command");

    if (
        ![
            "start",
            "present",
            "reveal",
            "video",
            "finish",
        ].includes(String(command))
    ) {
        throw new Error("Comando inválido");
    }

    if (command === "present" && !categoryId) {
        throw new Error("Falta la terna");
    }

    const supabase = await admin();

    const { error } = await supabase.rpc(
        "admin_ceremony_control",
        {
            p_edition_id: editionId,
            p_command: command,
            p_category_id: categoryId,
        }
    );

    if (error) {
        throw new Error(
            `No se pudo avanzar la gala: ${error.message}`
        );
    }

    refresh();
}
