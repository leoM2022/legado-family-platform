
import type { Nominee } from "@/data/demo/award-nominees";

interface NomineeCardProps {
    nominee: Nominee;
    position: number;
}

export default function NomineeCard({
                                        nominee,
                                        position,
                                    }: NomineeCardProps) {
    return (
        <article className="group overflow-hidden rounded-2xl border border-[#d4af37]/20 bg-[#18171b] transition-all duration-300 hover:-translate-y-1 hover:border-[#d4af37]/70">
            {/* Imagen ficticia del nominado */}
            <div className="relative flex aspect-[4/5] items-center justify-center bg-[radial-gradient(circle_at_center,#514029,#1b171b_75%)]">
        <span
            aria-hidden="true"
            className="text-7xl transition-transform duration-300 group-hover:scale-110"
        >
          {nominee.symbol}
        </span>

                <span className="absolute bottom-5 left-5 rounded-full border border-[#d4af37]/40 bg-black/60 px-4 py-2 text-xs uppercase tracking-widest text-[#e6c785]">
          Nominado {String(position).padStart(2, "0")}
        </span>
            </div>

            {/* Información */}
            <div className="p-7">
                <h3 className="font-serif text-2xl text-[#f7f3e8]">
                    {nominee.title}
                </h3>

                <p className="mt-4 leading-7 text-white/60">
                    {nominee.description}
                </p>

                <div className="mt-7 border-t border-white/10 pt-5">
                    <p className="text-xs uppercase tracking-widest text-[#d4af37]">
                        GoyaAwards · Nominación oficial
                    </p>
                </div>
            </div>
        </article>
    );
}
