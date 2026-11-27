import Image from "next/image";
import type { ReactNode } from "react";
import SplitText from "./SplitText";

export default function GalaEmptyState({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="gala-panel gala-empty">
            <Image src="/icon.svg" width={52} height={52} alt="" unoptimized />
            <h2 className="font-serif text-3xl text-[#fff0d3] sm:text-4xl"><SplitText text={title} /></h2>
            {children}
        </section>
    );
}
