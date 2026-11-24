
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface LogoutButtonProps {
    compact?: boolean;
}

export default function LogoutButton({
                                         compact = false,
                                     }: LogoutButtonProps) {
    const [loading, setLoading] = useState(false);

    async function logout() {
        setLoading(true);

        const supabase = createClient();
        const { error } = await supabase.auth.signOut();

        if (error) {
            alert("No se pudo cerrar la sesión.");
            setLoading(false);
            return;
        }

        // Navegación completa para limpiar
        // el estado visual de la sesión.
        window.location.assign("/login");
    }

    return (
        <button
            type="button"
            onClick={logout}
            disabled={loading}
            className={
                compact
                    ? "rounded-full border border-white/20 px-5 py-2 text-sm text-white/70 transition hover:border-[#d4af37] hover:text-[#e6c785] disabled:opacity-50"
                    : "mt-8 rounded-full border border-[#d4af37] px-6 py-3 text-[#e6c785] transition hover:bg-[#d4af37] hover:text-black disabled:opacity-50"
            }
        >
            {loading ? "Cerrando..." : "Cerrar sesión"}
        </button>
    );
}
