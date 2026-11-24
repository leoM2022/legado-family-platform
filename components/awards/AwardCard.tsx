
import Link from "next/link";
import type { AwardCategory } from "@/data/demo/award-categories";

interface AwardCardProps {
    category: AwardCategory;
}

export default function AwardCard({
                                      category,
                                  }: AwardCardProps) {
    return (
        <Link
            href={`/premios/${category.id}`}
            className="group block h-full rounded-2xl border border-[#d4af37]/20 bg-[#18171b] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#d4af37]/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4af37]"
        >
      <span className="font-serif text-4xl text-[#d4af37]">
        {category.number}
      </span>

            <h3 className="mt-8 font-serif text-2xl">
                {category.title}
            </h3>

            <p className="mt-4 leading-7 text-white/60">
                {category.description}
            </p>

            <div className="mt-8 border-t border-white/10 pt-5">
        <span className="text-sm font-medium text-[#e6c785]">
          Ver nominados
          <span
              aria-hidden="true"
              className="ml-2 inline-block transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </span>
            </div>
        </Link>
    );
}
