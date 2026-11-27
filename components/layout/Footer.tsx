
export default function Footer({ demo = false }: { demo?: boolean }) {
    return (
        <footer className="border-t border-white/10 bg-[#080809] px-6 py-10">
            <div className="mx-auto max-w-7xl text-center">
                <p className="font-serif text-2xl tracking-wider text-[#e6c785]">
                    Legado
                </p>

                <p className="mt-3 text-sm text-white/50">
                    Una familia. Mil historias. Un legado.
                </p>

                {demo && (
                    <p className="mt-6 border-t border-white/10 pt-6 text-xs text-white/55">
                        Proyecto demostrativo con información ficticia.
                    </p>
                )}
            </div>
        </footer>
    );
}
