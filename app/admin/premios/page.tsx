
import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";

import {
    saveAwardEdition,
    saveAwardCategory,
    saveAwardNominee,
} from "./actions";

type Edition = {
    id: string;
    year: number;
    title: string;
    status: "draft" | "voting" | "closed" | "published";
};

type Category = {
    id: string;
    edition_id: string;
    slug: string;
    title: string;
    description: string;
    display_order: number;
};

type Nominee = {
    id: string;
    category_id: string;
    title: string;
    description: string;
    symbol: string;
    display_order: number;
    family_user_id: string | null;
};

type Member = {
    id: string;
    display_name: string;
};

type Dashboard = {
    editions: Edition[];
    categories: Category[];
    nominees: Nominee[];
    members: Member[];
};

const fieldClass =
    "w-full rounded-xl border border-white/20 bg-[#0b0b0d] p-3 text-white";

const buttonClass =
    "rounded-full bg-[#d4af37] px-6 py-3 font-semibold text-black";

const sectionClass =
    "rounded-2xl border border-[#d4af37]/20 bg-[#18171b] p-6";

function EditionForm({
                         edition,
                     }: {
    edition?: Edition;
}) {
    return (
        <form
            action={saveAwardEdition}
            className="space-y-4"
        >
            <input
                type="hidden"
                name="id"
                value={edition?.id ?? ""}
            />

            <div>
                <label className="mb-2 block text-sm">
                    Año de la edición
                </label>

                <input
                    type="number"
                    name="year"
                    min={2020}
                    max={2100}
                    required
                    defaultValue={edition?.year ?? ""}
                    placeholder="2027"
                    className={fieldClass}
                />
            </div>

            <div>
                <label className="mb-2 block text-sm">
                    Nombre de la edición
                </label>

                <input
                    type="text"
                    name="title"
                    maxLength={120}
                    required
                    defaultValue={edition?.title ?? ""}
                    placeholder="Legado 2027"
                    className={fieldClass}
                />
            </div>

            <button
                type="submit"
                className={buttonClass}
            >
                {edition ? "Actualizar edición" : "Crear edición"}
            </button>
        </form>
    );
}

function CategoryForm({
                          category,
                          editions,
                      }: {
    category?: Category;
    editions: Edition[];
}) {
    return (
        <form
            action={saveAwardCategory}
            className="space-y-4"
        >
            <input
                type="hidden"
                name="id"
                value={category?.id ?? ""}
            />

            <div>
                <label className="mb-2 block text-sm">
                    Edición
                </label>

                <select
                    name="edition_id"
                    required
                    defaultValue={category?.edition_id ?? ""}
                    className={fieldClass}
                >
                    <option value="" disabled>
                        Seleccionar edición
                    </option>

                    {editions.map((edition) => (
                        <option
                            key={edition.id}
                            value={edition.id}
                        >
                            {edition.year} — {edition.title}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="mb-2 block text-sm">
                    Nombre de la categoría
                </label>

                <input
                    name="title"
                    required
                    maxLength={120}
                    defaultValue={category?.title ?? ""}
                    placeholder="Cocinero del año"
                    className={fieldClass}
                />
            </div>

            <div>
                <label className="mb-2 block text-sm">
                    Slug
                </label>

                <input
                    name="slug"
                    required
                    maxLength={80}
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    defaultValue={category?.slug ?? ""}
                    placeholder="cocinero-del-ano"
                    className={fieldClass}
                />

                <p className="mt-1 text-xs text-white/40">
                    Solo minúsculas, números y guiones.
                </p>
            </div>

            <div>
                <label className="mb-2 block text-sm">
                    Descripción
                </label>

                <textarea
                    name="description"
                    rows={3}
                    maxLength={500}
                    defaultValue={category?.description ?? ""}
                    className={fieldClass}
                />
            </div>

            <div>
                <label className="mb-2 block text-sm">
                    Orden
                </label>

                <input
                    name="display_order"
                    type="number"
                    min={0}
                    max={100000}
                    required
                    defaultValue={category?.display_order ?? 1}
                    className={fieldClass}
                />
            </div>

            <button
                type="submit"
                className={buttonClass}
            >
                {category ? "Actualizar categoría" : "Crear categoría"}
            </button>
        </form>
    );
}

function NomineeForm({
                         nominee,
                         categories,
                         editions,
                         members,
                     }: {
    nominee?: Nominee;
    categories: Category[];
    editions: Edition[];
    members: Member[];
}) {
    return (
        <form
            action={saveAwardNominee}
            className="space-y-4"
        >
            <input
                type="hidden"
                name="id"
                value={nominee?.id ?? ""}
            />

            <div>
                <label className="mb-2 block text-sm">
                    Categoría
                </label>

                <select
                    name="category_id"
                    required
                    defaultValue={nominee?.category_id ?? ""}
                    className={fieldClass}
                >
                    <option value="" disabled>
                        Seleccionar categoría
                    </option>

                    {categories.map((category) => {
                        const edition = editions.find(
                            (item) => item.id === category.edition_id
                        );

                        return (
                            <option
                                key={category.id}
                                value={category.id}
                            >
                                {edition?.year ?? "—"} — {category.title}
                            </option>
                        );
                    })}
                </select>
            </div>

            <div>
                <label className="mb-2 block text-sm">
                    Título del nominado
                </label>

                <input
                    name="title"
                    required
                    maxLength={120}
                    defaultValue={nominee?.title ?? ""}
                    placeholder="La gran receta familiar"
                    className={fieldClass}
                />
            </div>

            <div>
                <label className="mb-2 block text-sm">
                    Descripción
                </label>

                <textarea
                    name="description"
                    rows={3}
                    maxLength={500}
                    defaultValue={nominee?.description ?? ""}
                    className={fieldClass}
                />
            </div>

            <div>
                <label className="mb-2 block text-sm">
                    Símbolo
                </label>

                <input
                    name="symbol"
                    maxLength={12}
                    defaultValue={nominee?.symbol ?? "🏆"}
                    className={fieldClass}
                />
            </div>

            <div>
                <label className="mb-2 block text-sm">
                    Orden
                </label>

                <input
                    name="display_order"
                    type="number"
                    min={0}
                    max={100000}
                    required
                    defaultValue={nominee?.display_order ?? 1}
                    className={fieldClass}
                />
            </div>

            <div>
                <label className="mb-2 block text-sm">
                    Familiar vinculado (opcional)
                </label>

                <select
                    name="family_user_id"
                    defaultValue={nominee?.family_user_id ?? ""}
                    className={fieldClass}
                >
                    <option value="">
                        Ninguno — nominar un momento o evento
                    </option>

                    {members.map((member) => (
                        <option
                            key={member.id}
                            value={member.id}
                        >
                            {member.display_name}
                        </option>
                    ))}
                </select>

                <p className="mt-2 text-xs text-white/50">
                    La vinculación no comparte automáticamente
                    su fotografía de perfil.
                </p>
            </div>

            <button
                type="submit"
                className={buttonClass}
            >
                {nominee ? "Actualizar nominado" : "Crear nominado"}
            </button>
        </form>
    );
}

async function AwardsAdminContent() {
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
            .select("role, approval_status")
            .eq("id", user.id)
            .maybeSingle();

    if (
        profileError ||
        profile?.approval_status !== "approved" ||
        profile.role !== "admin"
    ) {
        notFound();
    }

    const { data, error } = await supabase.rpc(
        "admin_family_awards_dashboard"
    );

    if (error || !data) {
        console.error(
            "Error al consultar premios:",
            error?.message
        );

        return (
            <p role="alert" className="text-red-400">
                No se pudo cargar la administración de premios.
            </p>
        );
    }

    const dashboard = data as unknown as Dashboard;

    const editions = dashboard.editions ?? [];
    const categories = dashboard.categories ?? [];
    const nominees = dashboard.nominees ?? [];
    const members = dashboard.members ?? [];

    const draftEditions = editions.filter(
        (edition) => edition.status === "draft"
    );

    const draftCategories = categories.filter(
        (category) =>
            draftEditions.some(
                (edition) => edition.id === category.edition_id
            )
    );

    return (
        <div className="space-y-12">

            {/* EDICIONES */}
            <section className={sectionClass}>
                <h2 className="mb-6 font-serif text-2xl text-[#e6c785]">
                    1. Ediciones
                </h2>

                <h3 className="mb-4 font-semibold">
                    Nueva edición
                </h3>

                <EditionForm />

                <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
                    <h3 className="mb-4 font-semibold">
                        Ediciones existentes ({editions.length})
                    </h3>

                    {editions.map((edition) => (
                        <details
                            key={edition.id}
                            className="rounded-xl border border-white/10 p-4"
                        >
                            <summary className="cursor-pointer">
                                {edition.year} — {edition.title} ({edition.status})
                            </summary>

                            {edition.status === "draft" ? (
                                <div className="mt-5">
                                    <EditionForm edition={edition} />
                                </div>
                            ) : (
                                <p className="mt-3 text-sm text-white/50">
                                    Esta edición está bloqueada para edición.
                                </p>
                            )}
                        </details>
                    ))}
                </div>
            </section>

            {/* CATEGORÍAS */}
            <section className={sectionClass}>
                <h2 className="mb-6 font-serif text-2xl text-[#e6c785]">
                    2. Categorías
                </h2>

                {draftEditions.length > 0 ? (
                    <>
                        <h3 className="mb-4 font-semibold">
                            Nueva categoría
                        </h3>

                        <CategoryForm editions={draftEditions} />
                    </>
                ) : (
                    <p className="text-white/60">
                        Primero creá una edición en borrador.
                    </p>
                )}

                <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
                    <h3 className="mb-4 font-semibold">
                        Categorías existentes ({categories.length})
                    </h3>

                    {categories.map((category) => {
                        const edition = editions.find(
                            (item) => item.id === category.edition_id
                        );

                        const editable = edition?.status === "draft";

                        return (
                            <details
                                key={category.id}
                                className="rounded-xl border border-white/10 p-4"
                            >
                                <summary className="cursor-pointer">
                                    {edition?.year ?? "—"} — {category.title}
                                </summary>

                                {editable ? (
                                    <div className="mt-5">
                                        <CategoryForm
                                            category={category}
                                            editions={draftEditions}
                                        />
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm text-white/50">
                                        Categoría bloqueada.
                                    </p>
                                )}
                            </details>
                        );
                    })}
                </div>
            </section>

            {/* NOMINADOS */}
            <section className={sectionClass}>
                <h2 className="mb-6 font-serif text-2xl text-[#e6c785]">
                    3. Nominados
                </h2>

                {draftCategories.length > 0 ? (
                    <>
                        <h3 className="mb-4 font-semibold">
                            Nuevo nominado
                        </h3>

                        <NomineeForm
                            categories={draftCategories}
                            editions={editions}
                            members={members}
                        />
                    </>
                ) : (
                    <p className="text-white/60">
                        Primero creá una categoría en una edición borrador.
                    </p>
                )}

                <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
                    <h3 className="mb-4 font-semibold">
                        Nominados existentes ({nominees.length})
                    </h3>

                    {nominees.map((nominee) => {
                        const category = categories.find(
                            (item) => item.id === nominee.category_id
                        );

                        const editable = draftCategories.some(
                            (item) => item.id === nominee.category_id
                        );

                        return (
                            <details
                                key={nominee.id}
                                className="rounded-xl border border-white/10 p-4"
                            >
                                <summary className="cursor-pointer">
                                    {nominee.symbol} {nominee.title}
                                    {" — "}
                                    {category?.title ?? "Sin categoría"}
                                </summary>

                                {editable ? (
                                    <div className="mt-5">
                                        <NomineeForm
                                            nominee={nominee}
                                            categories={draftCategories}
                                            editions={editions}
                                            members={members}
                                        />
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm text-white/50">
                                        Nominado bloqueado.
                                    </p>
                                )}
                            </details>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

export default function AdminAwardsPage() {
    return (
        <div className="min-h-screen bg-[#0b0b0d] text-white">
            <Navbar />

            <main className="mx-auto max-w-4xl px-6 py-16">
                <Link
                    href="/mi-espacio"
                    className="text-sm text-white/60"
                >
                    ← Volver a mi espacio
                </Link>

                <header className="mb-12 mt-10">
                    <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
                        Legado · Administración
                    </p>

                    <h1 className="font-serif text-4xl text-[#e6c785]">
                        Gestión de premiaciones
                    </h1>

                    <p className="mt-4 text-white/60">
                        Organizá ediciones, categorías y nominaciones
                        familiares desde un panel privado.
                    </p>
                </header>

                <Suspense
                    fallback={
                        <p className="text-[#e6c785]">
                            Cargando premiaciones...
                        </p>
                    }
                >
                    <AwardsAdminContent />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
