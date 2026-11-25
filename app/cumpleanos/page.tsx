
import { Suspense } from "react";
import { redirect } from "next/navigation";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";

interface Birthday {
    family_name: string;
    birthday_day: number;
    birthday_month: number;
}

const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
];

async function FamilyBirthdays() {
    const supabase = await createClient();

    // Verificar sesión.
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // Verificar aprobación.
    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("approval_status")
            .eq("id", user.id)
            .maybeSingle();

    if (profileError) {
        throw new Error("No se pudo verificar tu cuenta.");
    }

    if (profile?.approval_status !== "approved") {
        redirect("/pendiente");
    }

    // Consultar solo cumpleaños autorizados.
    const { data, error } = await supabase.rpc(
        "get_family_birthdays"
    );

    if (error) {
        console.error("Error de calendario:", error.message);

        return (
            <p role="alert" className="text-center text-red-400">
                No se pudo cargar el calendario familiar.
            </p>
        );
    }

    const birthdays = (data ?? []) as Birthday[];

    return (
        <>
            <p className="mb-10 text-center text-sm text-white/50">
                {birthdays.length} cumpleaños compartidos
            </p>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {months.map((month, index) => {
                    const monthBirthdays = birthdays
                        .filter(
                            (birthday) =>
                                birthday.birthday_month === index + 1
                        )
                        .sort(
                            (a, b) =>
                                a.birthday_day - b.birthday_day
                        );

                    return (
                        <section
                            key={month}
                            className="rounded-2xl border border-[#d4af37]/20 bg-[#18171b] p-6"
                        >
                            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                                <h2 className="font-serif text-2xl text-[#e6c785]">
                                    {month}
                                </h2>

                                <span className="text-sm text-white/40">
                  {String(index + 1).padStart(2, "0")}
                </span>
                            </div>

                            {monthBirthdays.length === 0 ? (
                                <p className="text-sm text-white/40">
                                    Sin cumpleaños compartidos.
                                </p>
                            ) : (
                                <ul className="space-y-4">
                                    {monthBirthdays.map((birthday, i) => (
                                        <li
                                            key={`${birthday.birthday_day}-${i}`}
                                            className="flex items-center gap-4"
                                        >
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#d4af37]/10 font-serif text-xl text-[#e6c785]">
                                                {birthday.birthday_day}
                                            </div>

                                            <div>
                                                <p className="font-medium text-white">
                                                    {birthday.family_name}
                                                </p>
                                                <p className="text-xs text-white/50">
                                                    🎂 Cumpleaños
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    );
                })}
            </div>
        </>
    );
}

export default function BirthdaysPage() {
    return (
        <div className="min-h-screen bg-[#0b0b0d] text-white">
            <Navbar />

            <main className="mx-auto max-w-7xl px-6 py-20">
                <header className="mb-14 text-center">
                    <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
                        Nuestra familia
                    </p>

                    <h1 className="font-serif text-5xl text-[#e6c785] sm:text-6xl">
                        Calendario de cumpleaños
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-white/60">
                        Cada fecha especial merece ser recordada.
                        Celebramos juntos a quienes forman parte
                        de nuestra familia.
                    </p>
                </header>

                <Suspense
                    fallback={
                        <p className="text-center text-[#e6c785]">
                            Cargando cumpleaños...
                        </p>
                    }
                >
                    <FamilyBirthdays />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
