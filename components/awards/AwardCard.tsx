
import Link from "next/link";
import type { AwardCategory } from "@/data/demo/award-categories";

interface AwardCardProps {
    category: AwardCategory;
}

export default function AwardCard({
                                      category,
                                  }: AwardCardProps) {
    return (
        <Link href={`/premios/${category.id}`} className="gala-panel gala-card gala-award-card">
            <span aria-hidden="true" className="gala-award-mark">✦</span>
            <h3 className="mt-5 font-serif text-3xl">{category.title}</h3>
            <p className="mt-3 leading-relaxed text-white/70">{category.description}</p>
            <span className="gala-award-link">Ver nominados</span>
        </Link>
    );
}
