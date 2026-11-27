import Link from "next/link";
import SplitText from "@/components/ui/SplitText";

const sections = [
    {
        symbol: "✦",
        title: "Recuerdos familiares",
        description:
            "Un lugar para guardar fotografías, celebraciones y momentos especiales.",
        href: "/comunidad",
        link: "Ir a la comunidad",
    },
    {
        symbol: "♡",
        title: "Cumpleaños y celebraciones",
        description:
            "Un calendario para recordar y celebrar las fechas especiales de nuestra familia.",
        href: "/cumpleanos",
        link: "Ver cumpleaños",
    },
];

export default function FamilySection() {
    return (
        <section
            id="familia"
            className="scroll-mt-24 border-y border-white/10 bg-[#141316] px-6 py-24"
        >
            <div className="mx-auto max-w-7xl">
                <h2 className="gala-reveal mb-12 text-center font-serif text-4xl sm:text-5xl"><SplitText text="Mucho más que premios" /></h2>

                <div className="gala-reveal grid gap-6 md:grid-cols-2">
                    {sections.map((section) => (
                        <article
                            key={section.title}
                            className="gala-panel gala-card p-8"
                        >
                            <p
                                className="mb-5 text-4xl"
                                aria-hidden="true"
                            >
                                {section.symbol}
                            </p>

                            <h3 className="font-serif text-3xl text-[#e6c785]">
                                {section.title}
                            </h3>

                            <p className="mt-4 leading-7 text-white/65">
                                {section.description}
                            </p>

                            <Link href={section.href} className="gala-button mt-8">
                                {section.link}
                            </Link>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
