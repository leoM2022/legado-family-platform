"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";

const months = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "UTC" }).format(Date.UTC(2000, month, 1))
);
const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const firstYear = 2026;
const lastYear = 9999;

type BirthdayGroup = { names: string[]; cards: ReactNode };
type Props = {
    today: { year: number; month: number; day: number };
    days: Record<string, BirthdayGroup>;
    upcoming: { name: string; month: number; day: number; date: number; year: number }[];
};

export default function BirthdayCalendar({ today, days, upcoming }: Props) {
    const [month, setMonth] = useState<number | null>(null);
    const [day, setDay] = useState<number | null>(null);
    const [year, setYear] = useState(Math.max(firstYear, today.year));
    const controls = useRef<HTMLHeadingElement>(null);
    const opener = useRef("");

    function openMonth(target: HTMLButtonElement, nextMonth: number, nextDay: number | null = null, nextYear = year) {
        opener.current = target.id;
        setMonth(nextMonth);
        setDay(nextDay);
        setYear(nextYear);
        requestAnimationFrame(() => controls.current?.focus());
    }

    function closeMonth() {
        setMonth(null);
        setDay(null);
        requestAnimationFrame(() => document.getElementById(opener.current)?.focus());
    }

    function changeYear(value: number) {
        if (!Number.isInteger(value) || value < firstYear || value > lastYear) return;
        setYear(value);
        setDay(null);
    }

    function submitYear(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        changeYear(Number(new FormData(event.currentTarget).get("year")));
    }

    if (month === null) {
        return (
            <div className="space-y-5">
                {upcoming.length > 0 && (
                    <section className="gala-panel p-4 sm:p-6">
                        <h2 className="mb-3 font-serif text-xl text-[#e6c785]">Próximos cumpleaños</h2>
                        <ul className="grid gap-2 sm:grid-cols-3">
                            {upcoming.map((birthday, index) => (
                                <li key={index}>
                                    <button id={`birthday-upcoming-${index}`} type="button" className="gala-button w-full flex-col items-start text-left"
                                        onClick={(event) => openMonth(event.currentTarget, birthday.month, birthday.day, birthday.year)}>
                                        <span className="text-xs text-white/65">
                                            {birthday.date === Date.UTC(today.year, today.month, today.day) ? "Hoy" :
                                                `${birthday.day} de ${months[birthday.month]}`}
                                        </span>
                                        <span className="w-full wrap-break-word">{birthday.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {months.map((name, index) => {
                        const entries = Array.from({ length: 31 }, (_, dayIndex) => dayIndex + 1)
                            .flatMap((date) => (days[`${index}:${date}`]?.names ?? []).map((person) => ({ date, person })));
                        return (
                            <section key={name} className="gala-panel p-4">
                                <h2>
                                    <button id={`birthday-month-${index}`} type="button" className="gala-calendar-month w-full px-3 text-left font-semibold"
                                        onClick={(event) => openMonth(event.currentTarget, index)}>
                                        {name}
                                    </button>
                                </h2>
                                {entries.length > 0 ? (
                                    <ul className="mt-3 space-y-2">
                                        {entries.map(({ date, person }, entryIndex) => (
                                            <li key={entryIndex} className="flex min-w-0 items-baseline gap-2 text-sm">
                                                <span className="w-6 shrink-0 text-center font-semibold text-[#e6c785]">{date}</span>
                                                <span className="wrap-break-word">{person}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="mt-3 text-sm text-white/65">Sin cumpleaños compartidos.</p>}
                            </section>
                        );
                    })}
                </div>
            </div>
        );
    }

    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const startsOn = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    const selected = day === null ? undefined : days[`${month}:${day}`];
    const monthHasBirthdays = Object.keys(days).some((key) => key.startsWith(`${month}:`));
    const leapDay = month === 1 && lastDay === 28 && days["1:29"];

    return (
        <div className="space-y-5">
            <section className="gala-panel p-3 sm:p-6" aria-label="Calendario mensual">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <button type="button" className="gala-button" onClick={closeMonth}>Volver a los meses</button>
                    <form className="flex flex-wrap items-center gap-2" onSubmit={submitYear}>
                        <label htmlFor="birthday-year" className="text-sm text-white/75">Año</label>
                        <input key={year} id="birthday-year" name="year" type="number" min={firstYear} max={lastYear}
                            defaultValue={year} required
                            className="min-h-11 w-24 rounded-lg border border-white/20 bg-black/30 px-2" />
                        <button type="submit" className="gala-button">Aplicar</button>
                    </form>
                </div>
                <div className="my-4 flex items-center justify-between gap-2 border-y border-white/10 py-3">
                    <button type="button" className="gala-button" disabled={year === firstYear} onClick={() => changeYear(year - 1)}
                        aria-label="Año anterior">‹</button>
                    <h2 ref={controls} tabIndex={-1} className="font-serif text-2xl capitalize text-[#fff0d3] sm:text-3xl" aria-live="polite">
                        {months[month]} {year}
                    </h2>
                    <button type="button" className="gala-button" disabled={year === lastYear} onClick={() => changeYear(year + 1)}
                        aria-label="Año siguiente">›</button>
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {weekdays.map((name) => <span key={name} className="pb-1 text-center text-xs text-white/65 sm:text-sm">{name}</span>)}
                    {Array.from({ length: startsOn }, (_, index) => <span key={`space-${index}`} aria-hidden="true" />)}
                    {Array.from({ length: lastDay }, (_, index) => {
                        const date = index + 1;
                        const group = days[`${month}:${date}`];
                        const current = year === today.year && month === today.month && date === today.day;
                        return group ? (
                            <button key={date} type="button" className="gala-calendar-day gala-calendar-day--birthday"
                                aria-current={current ? "date" : undefined} aria-pressed={day === date}
                                aria-controls="birthday-details"
                                aria-label={`${date} de ${months[month]}, ${group.names.length} ${group.names.length === 1 ? "cumpleaños compartido" : "cumpleaños compartidos"}`}
                                onClick={() => setDay(date)}>
                                {date}<span aria-hidden="true">✦</span>
                            </button>
                        ) : (
                            <span key={date} className="gala-calendar-day" aria-current={current ? "date" : undefined}>{date}</span>
                        );
                    })}
                </div>
                {leapDay && <p className="mt-3 text-sm text-white/75">Los cumpleaños del 29 de febrero aparecen en el calendario de los años bisiestos.</p>}
            </section>
            <section id="birthday-details" aria-live="polite" className="gala-panel p-5 sm:p-6">
                <h2 className="font-serif text-xl capitalize text-[#e6c785]">
                    {selected ? `${day} de ${months[month]}` : "Cumpleaños del mes"}
                </h2>
                {selected ? selected.cards : (
                    <p className="mt-2 text-sm text-white/75">
                        {monthHasBirthdays ? "Elegí un día dorado para ver quién cumple años." : "Este mes no tiene cumpleaños compartidos."}
                    </p>
                )}
            </section>
        </div>
    );
}
