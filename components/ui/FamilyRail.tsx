"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export default function FamilyRail({ children }: { children: ReactNode[] }) {
    const rail = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const multiple = children.length > 1;

    function centerSlide(index: number) {
        const track = rail.current;
        const slide = track?.children.item(index);
        if (!track || !(slide instanceof HTMLElement)) return;

        track.scrollTo({ left: slide.offsetLeft + (slide.offsetWidth - track.clientWidth) / 2 });
    }

    function updateActive(track: HTMLDivElement) {
        const first = track.children.item(0);
        const second = track.children.item(1);
        if (!(first instanceof HTMLElement) || !(second instanceof HTMLElement)) return;

        const step = second.offsetLeft - first.offsetLeft;
        if (step > 0) setActiveIndex(Math.max(0, Math.min(children.length - 1, Math.round(track.scrollLeft / step))));
    }

    function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

        let index: number;
        switch (event.key) {
            case "ArrowLeft": index = activeIndex - 1; break;
            case "ArrowRight": index = activeIndex + 1; break;
            case "Home": index = 0; break;
            case "End": index = children.length - 1; break;
            default: return;
        }

        event.preventDefault();
        centerSlide(Math.max(0, Math.min(children.length - 1, index)));
    }

    return (
        <div className="gala-family-stage">
            <div
                ref={rail}
                className={multiple ? "gala-family-rail" : "gala-family-rail gala-family-rail--single"}
                role="region"
                aria-label="Perfiles familiares"
                tabIndex={multiple ? 0 : undefined}
                onScroll={multiple ? (event) => updateActive(event.currentTarget) : undefined}
                onKeyDown={multiple ? handleKeys : undefined}
            >
                {children.map((child, index) => (
                    <div
                        key={index}
                        className="gala-family-slide"
                        data-active={index === activeIndex}
                        onFocus={multiple ? () => centerSlide(index) : undefined}
                    >
                        {child}
                    </div>
                ))}
            </div>
        </div>
    );
}
