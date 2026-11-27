"use client";

import { useRef, type ReactNode } from "react";

export default function FamilyRail({ children }: { children: ReactNode }) {
    const rail = useRef<HTMLDivElement>(null);

    function move(direction: number) {
        const track = rail.current;
        const card = track?.firstElementChild;
        if (!track || !card) return;
        const gap = Number.parseFloat(getComputedStyle(track).columnGap);
        track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap) });
    }

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p id="family-rail-help" className="text-sm text-white/70">
                    Deslizá para recorrer los perfiles familiares.
                </p>
                <div className="flex gap-2">
                    <button type="button" className="gala-button" onClick={() => move(-1)} aria-controls="family-rail">Anterior</button>
                    <button type="button" className="gala-button" onClick={() => move(1)} aria-controls="family-rail">Siguiente</button>
                </div>
            </div>
            <div id="family-rail" className="gala-family-rail" ref={rail} tabIndex={0}
                 role="region" aria-label="Perfiles familiares" aria-describedby="family-rail-help">
                {children}
            </div>
        </>
    );
}
