import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import AwardsSection from "@/components/home/AwardsSection";
import FamilySection from "@/components/home/FamilySection";
import LegacySection from "@/components/home/LegacySection";
import FamilyAlbum from "@/components/family/FamilyAlbum";
import { createClient } from "@/lib/supabase/server";

async function HomeContent() {
    await connection();
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!error && user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("approval_status")
            .eq("id", user.id)
            .maybeSingle();

        if (profile?.approval_status === "approved") {
            return (
                <>
                    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14">
                        <FamilyAlbum supabase={supabase} />
                        <nav aria-label="Secciones familiares" className="mt-5 flex flex-wrap justify-center gap-2">
                            <Link href="/comunidad" className="gala-button">Comunidad</Link>
                            <Link href="/cumpleanos" className="gala-button">Cumpleaños</Link>
                            <Link href="/premios" className="gala-button">Premios</Link>
                        </nav>
                    </div>
                    <AwardsSection />
                    <LegacySection />
                </>
            );
        }
    }

    return (
        <>
            <Hero pending={!error && Boolean(user)} />
            <FamilySection />
            <AwardsSection />
            <LegacySection />
        </>
    );
}

export default function Home() {
    return (
        <div className="gala-room">
            <Navbar />
            <main>
                <Suspense fallback={<p className="px-6 py-12 text-center text-[#e6c785]">Cargando Legado…</p>}>
                    <HomeContent />
                </Suspense>
            </main>
            <Footer />
        </div>
    );
}
