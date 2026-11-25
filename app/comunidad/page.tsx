
import { Suspense } from "react";
import { redirect } from "next/navigation";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";

import {
    createPost,
    deletePost,
    createComment,
    deleteComment,
    reactToPost,
    removeReaction,
} from "./actions";

type FamilyPost = {
    post_id: string;
    author_id: string;
    author_name: string;
    content: string;
    created_at: string;
};

type FamilyComment = {
    comment_id: string;
    post_id: string;
    author_id: string;
    author_name: string;
    content: string;
    created_at: string;
};

type FamilyReaction = {
    post_id: string;
    user_id: string;
    reaction_type: string;
};

const reactionOptions = [
    { value: "like", label: "Me gusta", emoji: "👍" },
    { value: "love", label: "Me encanta", emoji: "❤️" },
    { value: "laugh", label: "Me divierte", emoji: "😂" },
];

function formatDate(value: string) {
    return new Intl.DateTimeFormat("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Argentina/Jujuy",
    }).format(new Date(value));
}

async function CommunityFeed() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("approval_status")
            .eq("id", user.id)
            .maybeSingle();

    if (profileError) {
        throw new Error("No se pudo verificar tu cuenta.");
    }

    if (profile?.approval_status !== "approved") {
        redirect("/pendiente");
    }

    // Obtener las publicaciones familiares.
    const { data: feedData, error: feedError } =
        await supabase.rpc("get_family_feed");

    if (feedError) {
        console.error(feedError.message);

        return (
            <p role="alert" className="text-red-400">
                No se pudo cargar el muro familiar.
            </p>
        );
    }

    const posts = (feedData ?? []) as FamilyPost[];
    const postIds = posts.map((post) => post.post_id);

    let comments: FamilyComment[] = [];
    let reactions: FamilyReaction[] = [];

    // Consultamos interacciones únicamente de los
    // posts que aparecen en el muro.
    if (postIds.length > 0) {
        const [commentsResult, reactionsResult] =
            await Promise.all([
                supabase.rpc("get_family_post_comments", {
                    p_post_ids: postIds,
                }),

                supabase
                    .from("family_post_reactions")
                    .select("post_id, user_id, reaction_type")
                    .in("post_id", postIds),
            ]);

        if (commentsResult.error || reactionsResult.error) {
            console.error(
                "Error al cargar interacciones:",
                commentsResult.error?.message,
                reactionsResult.error?.message
            );

            return (
                <p role="alert" className="text-red-400">
                    No se pudieron cargar los comentarios
                    y las reacciones.
                </p>
            );
        }

        comments =
            (commentsResult.data ?? []) as FamilyComment[];

        reactions =
            (reactionsResult.data ?? []) as FamilyReaction[];
    }

    return (
        <div className="mx-auto max-w-2xl space-y-8">

            {/* Crear publicación */}
            <section className="rounded-2xl border border-[#d4af37]/20 bg-[#18171b] p-6">
                <h2 className="mb-5 font-serif text-2xl text-[#e6c785]">
                    Compartir un momento
                </h2>

                <form action={createPost} className="space-y-4">
                    <label
                        htmlFor="post-content"
                        className="block text-sm text-white/70"
                    >
                        ¿Qué querés compartir?
                    </label>

                    <textarea
                        id="post-content"
                        name="content"
                        required
                        maxLength={1200}
                        rows={4}
                        placeholder="Escribí algo para tu familia..."
                        className="w-full rounded-xl border border-white/15 bg-[#0b0b0d] p-4 text-white"
                    />

                    <p className="text-xs text-white/40">
                        Publicación visible para familiares aprobados.
                    </p>

                    <button
                        type="submit"
                        className="rounded-full bg-[#d4af37] px-6 py-3 font-semibold text-black"
                    >
                        Publicar
                    </button>
                </form>
            </section>

            {/* Muro */}
            <section className="space-y-6">
                <h2 className="font-serif text-2xl">
                    Publicaciones recientes
                </h2>

                {posts.length === 0 && (
                    <p className="text-white/50">
                        Todavía no hay publicaciones familiares.
                    </p>
                )}

                {posts.map((post) => {
                    const postComments = comments
                        .filter((c) => c.post_id === post.post_id)
                        .sort((a, b) =>
                            a.created_at.localeCompare(b.created_at)
                        );

                    const postReactions = reactions.filter(
                        (r) => r.post_id === post.post_id
                    );

                    const myReaction = postReactions.find(
                        (r) => r.user_id === user.id
                    );

                    return (
                        <article
                            key={post.post_id}
                            className="rounded-2xl border border-white/10 bg-[#18171b] p-6"
                        >
                            {/* Autor */}
                            <header className="mb-5">
                                <h3 className="font-semibold text-[#e6c785]">
                                    {post.author_name}
                                </h3>

                                <p className="mt-1 text-xs text-white/40">
                                    {formatDate(post.created_at)}
                                </p>
                            </header>

                            {/* Contenido */}
                            <p className="whitespace-pre-wrap break-words leading-7 text-white/80">
                                {post.content}
                            </p>

                            {/* Reacciones */}
                            <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
                                {reactionOptions.map((option) => {
                                    const count = postReactions.filter(
                                        (r) =>
                                            r.reaction_type === option.value
                                    ).length;

                                    const selected =
                                        myReaction?.reaction_type === option.value;

                                    return (
                                        <form
                                            key={option.value}
                                            action={reactToPost}
                                        >
                                            <input
                                                type="hidden"
                                                name="postId"
                                                value={post.post_id}
                                            />

                                            <button
                                                type="submit"
                                                name="reaction"
                                                value={option.value}
                                                aria-pressed={selected}
                                                className={
                                                    selected
                                                        ? "rounded-full border border-[#d4af37] bg-[#d4af37]/20 px-4 py-2 text-sm text-[#e6c785]"
                                                        : "rounded-full border border-white/15 px-4 py-2 text-sm text-white/60"
                                                }
                                            >
                                                {option.emoji} {option.label} {count}
                                            </button>
                                        </form>
                                    );
                                })}

                                {myReaction && (
                                    <form action={removeReaction}>
                                        <input
                                            type="hidden"
                                            name="postId"
                                            value={post.post_id}
                                        />

                                        <button
                                            type="submit"
                                            className="px-3 py-2 text-xs text-white/50 underline"
                                        >
                                            Quitar reacción
                                        </button>
                                    </form>
                                )}
                            </div>

                            {/* Comentarios */}
                            <div className="mt-7 border-t border-white/10 pt-6">
                                <h4 className="mb-5 font-semibold text-[#e6c785]">
                                    Comentarios ({postComments.length})
                                </h4>

                                <div className="space-y-4">
                                    {postComments.map((comment) => (
                                        <div
                                            key={comment.comment_id}
                                            className="rounded-xl bg-[#242127] p-4"
                                        >
                                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-[#e6c785]">
                                                    {comment.author_name}
                                                </p>

                                                <span className="text-xs text-white/40">
                          {formatDate(comment.created_at)}
                        </span>
                                            </div>

                                            <p className="whitespace-pre-wrap break-words text-sm text-white/80">
                                                {comment.content}
                                            </p>

                                            {comment.author_id === user.id && (
                                                <form
                                                    action={deleteComment}
                                                    className="mt-3"
                                                >
                                                    <input
                                                        type="hidden"
                                                        name="commentId"
                                                        value={comment.comment_id}
                                                    />

                                                    <button
                                                        type="submit"
                                                        className="text-xs text-red-300"
                                                    >
                                                        Eliminar comentario
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Agregar comentario */}
                                <form
                                    action={createComment}
                                    className="mt-5 space-y-3"
                                >
                                    <input
                                        type="hidden"
                                        name="postId"
                                        value={post.post_id}
                                    />

                                    <label
                                        htmlFor={`comment-${post.post_id}`}
                                        className="block text-sm text-white/60"
                                    >
                                        Escribir comentario
                                    </label>

                                    <textarea
                                        id={`comment-${post.post_id}`}
                                        name="content"
                                        required
                                        maxLength={500}
                                        rows={2}
                                        placeholder="Escribí tu comentario..."
                                        className="w-full rounded-xl border border-white/15 bg-[#0b0b0d] p-3 text-sm text-white"
                                    />

                                    <button
                                        type="submit"
                                        className="rounded-full bg-[#d4af37] px-5 py-2 text-sm font-semibold text-black"
                                    >
                                        Comentar
                                    </button>
                                </form>
                            </div>

                            {/* Borrar publicación propia */}
                            {post.author_id === user.id && (
                                <form
                                    action={deletePost}
                                    className="mt-6 border-t border-white/10 pt-4"
                                >
                                    <input
                                        type="hidden"
                                        name="postId"
                                        value={post.post_id}
                                    />

                                    <button
                                        type="submit"
                                        className="text-sm text-red-300"
                                    >
                                        Eliminar publicación
                                    </button>
                                </form>
                            )}
                        </article>
                    );
                })}
            </section>
        </div>
    );
}

export default function CommunityPage() {
    return (
        <div className="min-h-screen bg-[#0b0d0d] text-white">
            <Navbar />

            <main className="mx-auto max-w-5xl px-6 py-16">
                <header className="mb-12 text-center">
                    <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
                        Comunidad GoyaAwards
                    </p>

                    <h1 className="font-serif text-5xl text-[#e6c785]">
                        Nuestro espacio familiar
                    </h1>

                    <p className="mt-5 text-white/60">
                        Historias, comentarios y momentos compartidos.
                    </p>
                </header>

                <Suspense
                    fallback={
                        <p className="text-center text-[#e6c785]">
                            Cargando comunidad...
                        </p>
                    }
                >
                    <CommunityFeed />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
