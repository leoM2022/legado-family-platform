import Image from "next/image";
import Link from "next/link";
import SplitText from "@/components/ui/SplitText";
import CeremonyCountdown from "./CeremonyCountdown";
import MagneticLink from "./MagneticLink";

export default function Hero() {
    const date = process.env.GOYA_CEREMONY_DATE;
    const timestamp = date && /(?:Z|[+-]\d{2}:\d{2})$/.test(date) ? Date.parse(date) : NaN;

    return (
        <section id="inicio" className="gala-hero">
            <div className="gala-architecture" aria-hidden="true">
                <Image src="/gala/trofeo.webp" alt="" fill sizes="100vw" preload unoptimized />
            </div>
            <div className="gala-hero-content">
                <p className="gala-kicker">La gala de nuestra familia</p>
                <h1 className="gala-wordmark"><SplitText text="GoyaAwards" /></h1>
                <p className="gala-tagline">Una familia. Mil historias. Un legado.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <MagneticLink href="/premios">Descubrir los premios</MagneticLink>
                    <Link href="/#legado" className="gala-button">Nuestra historia</Link>
                </div>
                <CeremonyCountdown target={Number.isFinite(timestamp) ? timestamp : null} />
            </div>
        </section>
    );
}
