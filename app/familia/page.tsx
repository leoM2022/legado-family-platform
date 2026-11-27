import FamilyAlbum from "@/components/family/FamilyAlbum";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";

async function ApprovedFamily() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("approval_status")
            .eq("id", user.id)
            .maybeSingle();

    if (profileError) {
        throw new Error("No pudimos verificar tu cuenta.");
    }

    if (profile?.approval_status !== "approved") {
        redirect("/pendiente");
    }

    return <FamilyAlbum supabase={supabase} />;
}

export default function FamilyPage() {
    return (
        <div className="gala-room">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
                <Suspense
                    fallback={
                        <p className="text-center text-[#e6c785]">
                            Cargando familia...
                        </p>
                    }
                >
                    <ApprovedFamily />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
