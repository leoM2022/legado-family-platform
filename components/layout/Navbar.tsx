import { Suspense } from "react";
import Link from "next/link";
import AuthNav from "@/components/layout/AuthNav";

export default function Navbar() {
    return (
        <header className="gala-nav">
            <nav aria-label="Navegación principal" className="gala-nav-inner">
                <Link href="/" className="gala-brand">
                    <span className="gala-brand-seal" aria-hidden="true">✦</span>
                    <span>Goya<em>Awards</em></span>
                </Link>
                <div className="gala-public-nav">
                    <Link href="/premios">Premios</Link>
                    <Link href="/#familia">Familia</Link>
                    <Link href="/#legado">Legado</Link>
                </div>
                <Suspense fallback={<span className="gala-nav-loading">Cargando cuenta…</span>}>
                    <AuthNav />
                </Suspense>
            </nav>
        </header>
    );
}
