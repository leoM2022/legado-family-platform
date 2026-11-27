import Image from "next/image";
import Link from "next/link";
import SplitText from "@/components/ui/SplitText";
import MagneticLink from "./MagneticLink";

export default function Hero({ pending = false }: { pending?: boolean }) {
    return (
        <section id="inicio" className="gala-hero">
            <div className="gala-architecture" aria-hidden="true">
                <Image src="/gala/trofeo.webp" alt="" fill sizes="100vw" preload unoptimized />
            </div>
            <div className="gala-hero-content">
                <p className="gala-kicker">Historias y recuerdos familiares</p>
                <h1 className="gala-wordmark"><SplitText text="Legado" /></h1>
                <p className="gala-tagline">Una familia. Mil historias. Un legado.</p>
                <p className="mt-5 max-w-sm text-white/80">
                    Un espacio privado para compartir recuerdos, celebrar cumpleaños y reunirnos en familia.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <MagneticLink href={pending ? "/pendiente" : "/login"}>{pending ? "Ver estado de mi cuenta" : "Iniciar sesión"}</MagneticLink>
                    <Link href="/#legado" className="gala-button">Nuestra historia</Link>
                </div>
            </div>
        </section>
    );
}
