"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";

export default function AccountMenu({ children }: { children: ReactNode }) {
    const menu = useRef<HTMLDetailsElement>(null);
    const trigger = useRef<HTMLElement>(null);

    useEffect(() => {
        function dismiss(event: PointerEvent) {
            const details = menu.current;
            if (details?.open && event.target instanceof Node && !details.contains(event.target)) {
                details.open = false;
            }
        }
        document.addEventListener("pointerdown", dismiss);
        return () => document.removeEventListener("pointerdown", dismiss);
    }, []);

    return (
        <details
            ref={menu}
            className="gala-account"
            onKeyDown={(event) => {
                if (event.key === "Escape" && event.currentTarget.open) {
                    event.currentTarget.open = false;
                    trigger.current?.focus();
                }
            }}
        >
            <summary ref={trigger} className="gala-button gala-account-trigger">
                <Image className="gala-account-icon" src="/icon.svg" width={22} height={22} alt="" unoptimized />
                Mi cuenta
            </summary>
            <div
                className="gala-account-panel"
                onClick={(event) => {
                    if (event.target instanceof Element && event.target.closest("a") && menu.current) {
                        menu.current.open = false;
                    }
                }}
            >
                {children}
            </div>
        </details>
    );
}
