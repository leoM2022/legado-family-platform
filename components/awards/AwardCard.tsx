
import type { AwardCategory } from "@/data/demo/award-categories";

interface AwardCardProps {
    category: AwardCategory;
}

export default function AwardCard({
                                      category,
                                  }: AwardCardProps) {
    return (
        <article className="rounded-2xl border border-[#d4af37]/20 bg-[#18171b] p-8 transition-colors duration-300 hover:border-[#d4af37]/70">
      <span className="font-serif text-4xl text-[#d4af37]">
        {category.number}
      </span>

            <h3 className="mt-8 font-serif text-2xl">
                {category.title}
            </h3>

            <p className="mt-4 leading-7 text-white/60">
                {category.description}
            </p>
        </article>
    );
}
