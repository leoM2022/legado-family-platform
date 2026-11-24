
export default function Hero() {
    return (
        <section
            id="inicio"
            className="relative isolate flex min-h-[78vh] items-center justify-center overflow-hidden px-6 py-24 text-center"
        >
            {/* Iluminación dorada de fondo */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_20%,rgba(212,175,55,0.18),transparent_55%)]"
            />

            <div className="mx-auto max-w-4xl">
                <p className="mb-7 text-xs font-semibold uppercase tracking-[0.35em] text-[#e6c785] sm:text-sm">
                    Una tradición que nos une
                </p>

                <h1 className="font-serif text-5xl leading-tight tracking-tight sm:text-7xl lg:text-8xl">
                    Las mejores historias
                    <span className="block italic text-[#e6c785]">
            se celebran.
          </span>
                </h1>

                <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
                    Un espacio para compartir recuerdos, celebrar
                    momentos y mantener vivas las historias que
                    nos unen como familia.
                </p>

                <div className="mt-10 flex flex-wrap justify-center gap-4">
                    <a
                        href="#premios"
                        className="rounded-full bg-[#d4af37] px-8 py-4 font-semibold text-black transition hover:bg-[#e6c785]"
                    >
                        Descubrir los premios
                    </a>

                    <a
                        href="#legado"
                        className="rounded-full border border-white/25 px-8 py-4 transition hover:border-[#e6c785] hover:text-[#e6c785]"
                    >
                        Nuestra historia
                    </a>
                </div>

                <p className="mt-14 text-xs uppercase tracking-[0.25em] text-white/40">
                    GoyaAwards · Edición de demostración
                </p>
            </div>
        </section>
    );
}
