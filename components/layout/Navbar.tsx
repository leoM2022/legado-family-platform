
import Link from "next/link";

const links = [
    { label: "Inicio", href: "/" },
    { label: "Premios", href: "/premios" },
    { label: "Familia", href: "/#familia" },
    { label: "Nuestro legado", href: "/#legado" },
];

export default function Navbar() {
    return (
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0b0d]/95 backdrop-blur-md">
            <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-5">

                {/* Logo */}
                <Link
                    href="/"
                    className="font-serif text-2xl font-semibold tracking-wider text-[#e6c785]"
                >
                    Goya<span className="text-white">Awards</span>
                </Link>

                {/* Navegación */}
                <div className="flex flex-wrap items-center gap-5 text-sm text-white/70 md:gap-8">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="transition hover:text-[#e6c785]"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Autenticación */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="rounded-full border border-[#d4af37]/50 px-5 py-2 text-sm text-[#e6c785] transition hover:bg-[#d4af37]/10"
                    >
                        Iniciar sesión
                    </Link>

                    <Link
                        href="/registro"
                        className="rounded-full bg-[#d4af37] px-5 py-2 text-sm font-semibold text-black transition hover:bg-[#e6c785]"
                    >
                        Registrarse
                    </Link>
                </div>

            </nav>
        </header>
    );
}
