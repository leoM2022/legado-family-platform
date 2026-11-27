import SplitText from "@/components/ui/SplitText";

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

    const todayLabel = new Intl.DateTimeFormat("en-CA", {
        year: "numeric", month: "2-digit", day: "2-digit",
        timeZone: "America/Argentina/Jujuy",
    }).formatToParts(new Date());
    const year = Number(todayLabel.find(({ type }) => type === "year")?.value);
    const month = Number(todayLabel.find(({ type }) => type === "month")?.value);
    const day = Number(todayLabel.find(({ type }) => type === "day")?.value);
    const today = Date.UTC(year, month - 1, day);
    const upcoming = birthdays.map((birthday) => {
        let nextYear = year;
        let nextDate = Date.UTC(nextYear, birthday.birthday_month - 1, birthday.birthday_day);
        const isLeapBirthday = birthday.birthday_month === 2 && birthday.birthday_day === 29;
        while (nextDate < today || (isLeapBirthday && new Date(nextDate).getUTCMonth() !== 1)) {
            nextYear += 1;
            nextDate = Date.UTC(nextYear, birthday.birthday_month - 1, birthday.birthday_day);
        }
        return { ...birthday, nextDate };
    }).sort((a, b) => a.nextDate - b.nextDate).slice(0, 3);
    const upcomingDate = new Intl.DateTimeFormat("es-AR", {
        day: "numeric", month: "long", timeZone: "UTC",
    });

    return (
        <>
            {upcoming.length > 0 && (
                <section className="gala-panel gala-profile-banner mb-8 p-6 sm:p-8">
                    <h2 className="font-serif text-3xl text-[#e6c785]">Próximos cumpleaños</h2>
                    <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                        {upcoming.map((birthday, index) => (
                            <li key={index} className="rounded-lg border border-[#e6c785]/25 bg-black/25 p-4">
                                <p className="gala-kicker">{birthday.nextDate === today ? "Hoy" : upcomingDate.format(birthday.nextDate)}</p>
                                <p className="mt-2 text-lg">{birthday.family_name}</p>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
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
                            className="gala-panel gala-card p-6"
                        >
                            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                                <h2 className="font-serif text-2xl text-[#e6c785]">
                                    {month}
                                </h2>

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
        <div className="gala-room">
            <Navbar />

            <main className="mx-auto max-w-7xl px-6 py-20">
                <header className="gala-page-header">
                    <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
                        Nuestra familia
                    </p>

                    <h1 className="font-serif text-5xl text-[#e6c785] sm:text-6xl"><SplitText text="Calendario de cumpleaños" /></h1>

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
