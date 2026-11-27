import BirthdayCalendar from "@/components/birthdays/BirthdayCalendar";
import FamilyAvatar from "@/components/profile/FamilyAvatar";
import type { FamilyMember } from "@/types/family";
import Link from "next/link";
import type { ReactNode } from "react";
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

type CalendarBirthday = Birthday & { profile?: FamilyMember };

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

    const [birthdaysResult, directoryResult] = await Promise.all([
        supabase.rpc("get_family_birthdays"),
        supabase.rpc("get_family_directory"),
    ]);

    if (birthdaysResult.error) {
        console.error("Error de calendario:", birthdaysResult.error.message);
        return <p role="alert" className="gala-panel p-5 text-red-300">No se pudo cargar el calendario familiar.</p>;
    }

    const groups = new Map<string, CalendarBirthday[]>();
    for (const birthday of (birthdaysResult.data ?? []) as Birthday[]) {
        const key = `${birthday.birthday_month - 1}:${birthday.birthday_day}`;
        const group = groups.get(key) ?? [];
        group.push(birthday);
        groups.set(key, group);
    }

    // El directorio autoriza por separado el perfil, el cumpleaños y la foto.
    // Cada registro del directorio ocupa una entrada del mismo nombre y fecha.
    for (const member of (directoryResult.error ? [] : (directoryResult.data ?? [])) as FamilyMember[]) {
        if (!member.birthday_day || !member.birthday_month) continue;
        const entries = groups.get(`${member.birthday_month - 1}:${member.birthday_day}`);
        const entry = entries?.find((birthday) => !birthday.profile &&
            birthday.family_name === (member.nickname ?? member.display_name));
        if (entry) entry.profile = member;
    }

    const parts = new Intl.DateTimeFormat("es-AR", {
        year: "numeric", month: "numeric", day: "numeric",
        timeZone: "America/Argentina/Jujuy",
    }).formatToParts(new Date());
    const today = {
        year: Number(parts.find(({ type }) => type === "year")?.value),
        month: Number(parts.find(({ type }) => type === "month")?.value) - 1,
        day: Number(parts.find(({ type }) => type === "day")?.value),
    };

    const days: Record<string, { names: string[]; cards: ReactNode }> = {};
    for (const [key, entries] of groups) {
        days[key] = {
            names: entries.map((entry) => entry.family_name),
            cards: (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {entries.map(({ family_name, profile }, index) => (
                        <li key={profile?.user_id ?? index} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#e6c785]/20 bg-black/25 p-3">
                            <div className="shrink-0">
                                <FamilyAvatar name={family_name} avatarPath={profile?.avatar_path ?? null} size={48} />
                            </div>
                            <div className="min-w-0">
                                <p className="wrap-break-word font-medium">{family_name}</p>
                                {profile && <Link href={`/familia/${profile.user_id}`} className="mt-1 inline-block text-sm text-[#e6c785] underline underline-offset-4">Ver perfil</Link>}
                            </div>
                        </li>
                    ))}
                </ul>
            ),
        };
    }

    const todayDate = Date.UTC(today.year, today.month, today.day);
    const upcoming = Array.from(groups.values()).flatMap((entries) => entries.map((birthday) => {
        const month = birthday.birthday_month - 1;
        const day = birthday.birthday_day;
        let year = today.year;
        let date = Date.UTC(year, month, day);
        while (date < todayDate || (month === 1 && day === 29 && new Date(date).getUTCMonth() !== month)) {
            date = Date.UTC(++year, month, day);
        }
        return { name: birthday.family_name, month, day, date, year };
    })).sort((a, b) => a.date - b.date).slice(0, 3);

    return <BirthdayCalendar today={today} days={days} upcoming={upcoming} />;
}

export default function BirthdaysPage() {
    return (
        <div className="gala-room">
            <Navbar />

            <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
                <header className="gala-page-header">
                    <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
                        Nuestra familia
                    </p>

                    <h1 className="font-serif text-5xl text-[#e6c785] sm:text-6xl"><SplitText text="Cumpleaños familiares" /></h1>

                    <p className="mt-4 max-w-2xl text-white/75">
                        Consultá las fechas que nuestra familia eligió compartir.
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
