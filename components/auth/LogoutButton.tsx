
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
    const router = useRouter();

    async function logout() {
        const supabase = createClient();

        const { error } = await supabase.auth.signOut();

        if (error) {
            alert("No se pudo cerrar la sesión.");
            return;
        }

        router.replace("/login");
        router.refresh();
    }

    return (
        <button
            onClick={logout}
            className="mt-8 rounded-full border border-[#d4af37] px-6 py-3 text-[#e6c785] transition hover:bg-[#d4af37] hover:text-black"
        >
            Cerrar sesión
        </button>
    );
}
