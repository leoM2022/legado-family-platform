"use client";

import Link from "next/link";
import type { PointerEvent, ReactNode } from "react";

export default function MagneticLink({ href, children }: { href: string; children: ReactNode }) {
    function followPointer(event: PointerEvent<HTMLAnchorElement>) {
        if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--magnet-x", `${(event.clientX - bounds.left - bounds.width / 2) * 0.12}px`);
        event.currentTarget.style.setProperty("--magnet-y", `${(event.clientY - bounds.top - bounds.height / 2) * 0.2}px`);
    }

    return (
        <Link
            href={href}
            className="gala-button gala-button--gold magnetic"
            onPointerMove={followPointer}
            onPointerLeave={({ currentTarget }) => {
                currentTarget.style.removeProperty("--magnet-x");
                currentTarget.style.removeProperty("--magnet-y");
            }}
        >
            {children}
        </Link>
    );
}
