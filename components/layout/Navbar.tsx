import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import AuthNav from "@/components/layout/AuthNav";

export default function Navbar() {
    return (
        <header className="gala-nav">
            <nav aria-label="Navegación principal" className="gala-nav-inner">
                <Link href="/" className="gala-brand">
                    <Image className="gala-brand-mark" src="/icon.svg" width={32} height={32} alt="" unoptimized />
                    <span>Legado</span>
                </Link>
                <div className="gala-public-nav">
                    <Link href="/premios">Premios</Link>
                    <Link href="/#familia">Familia</Link>
                    <Link href="/#legado">Historia</Link>
                </div>
                <Suspense fallback={<span className="gala-nav-loading">Cargando cuenta…</span>}>
                    <AuthNav />
                </Suspense>
            </nav>
        </header>
    );
}
