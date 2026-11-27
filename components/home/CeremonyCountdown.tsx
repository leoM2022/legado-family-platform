"use client";

import { useEffect, useState } from "react";

const units = ["Días", "Horas", "Minutos", "Segundos"];

export default function CeremonyCountdown({ target }: { target: number | null }) {
    const [now, setNow] = useState<number | null>(null);

    useEffect(() => {
        if (target === null) return;

        const tick = () => {
            const time = Date.now();
            setNow(time);
            if (time >= target) window.clearInterval(timer);
        };

        const timer = window.setInterval(tick, 1000);
        tick();
        return () => window.clearInterval(timer);
    }, [target]);

    const remaining = now === null || target === null ? null : Math.max(0, Math.ceil((target - now) / 1000));
    const values = remaining === null ? [] : [
        Math.floor(remaining / 86400),
        Math.floor(remaining / 3600) % 24,
        Math.floor(remaining / 60) % 60,
        remaining % 60,
    ];

    return (
        <div className="gala-countdown">
            <p className="gala-kicker">Próxima ceremonia</p>
            {target === null ? (
                <p className="mt-3 text-sm text-white/70">Fecha por confirmar</p>
            ) : remaining === 0 ? (
                <p className="mt-3 text-sm text-white/70">La cuenta regresiva terminó</p>
            ) : (
                <dl className="mt-5 grid grid-cols-4 gap-2 sm:gap-4" role="timer" aria-live="off">
                    {units.map((unit, index) => (
                        <div key={unit} className="flex min-w-0 flex-col-reverse gap-2">
                            <dt className="text-xs text-white/70">{unit}</dt>
                            <dd className="countdown-number">
                                {(values[index]?.toString().padStart(2, "0") ?? "––").split("").map((digit, position) => (
                                    <span key={position} className="overflow-hidden">
                                        <span key={digit} className="countdown-digit">{digit}</span>
                                    </span>
                                ))}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}
