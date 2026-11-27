import Link from "next/link";
import FamilyPostImage from "@/components/community/FamilyPostImage";
import { createClient } from "@/lib/supabase/server";

type Moment = {
    post_id: string;
    author_id: string;
    content: string;
    created_at: string;
};

const dateLabel = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeZone: "America/Argentina/Jujuy",
});

export default async function FamilyMoments({ authorId, own = false }: { authorId: string; own?: boolean }) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_family_feed");
    const posts = ((data ?? []) as Moment[])
        .filter((post) => post.author_id === authorId)
        .slice(0, 3);

    const images = new Map<string, string>();
    if (posts.length > 0) {
        const result = await supabase.rpc("get_family_post_images", {
            p_post_ids: posts.map((post) => post.post_id),
        });
        if (!result.error) {
            for (const row of (result.data ?? []) as { post_id: string; image_path: string }[]) {
                images.set(row.post_id, row.image_path);
            }
        }
    }

    return (
        <section className="mt-10" aria-labelledby="family-moments-heading">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <h2 id="family-moments-heading" className="font-serif text-3xl text-[#e6c785]">
                    {own ? "Mis fotos y publicaciones" : "Recuerdos compartidos"}
                </h2>
                <Link href="/comunidad" className="gala-button">Ir a la comunidad</Link>
            </div>
            {error ? (
                <p role="alert" className="text-white/70">No pudimos cargar las publicaciones.</p>
            ) : posts.length === 0 ? (
                <p className="gala-panel p-6 text-white/70">Todavía no hay publicaciones para mostrar.</p>
            ) : (
                <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {posts.map((post) => {
                        const image = images.get(post.post_id);
                        return (
                            <article key={post.post_id} className="gala-panel gala-card min-w-0 p-5">
                                <time dateTime={post.created_at} className="gala-kicker">
                                    {dateLabel.format(new Date(post.created_at))}
                                </time>
                                <p className="mt-3 whitespace-pre-wrap wrap-break-word">{post.content}</p>
                                {image && <FamilyPostImage imagePath={image} />}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
