
import { moderateFamilyContent } from
        "@/app/comunidad/actions";

interface ModerationFormProps {
    kind: "post" | "comment";
    id: string;
}

export default function ModerationForm({
                                           kind,
                                           id,
                                       }: ModerationFormProps) {
    return (
        <details className="mt-4">
            <summary className="cursor-pointer text-sm text-red-300">
                Moderar {kind === "post" ? "publicación" : "comentario"}
            </summary>

            <form
                action={moderateFamilyContent}
                className="mt-4 space-y-3"
            >
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="id" value={id} />

                <label
                    htmlFor={`reason-${kind}-${id}`}
                    className="block text-sm text-white/60"
                >
                    Motivo de la moderación
                </label>

                <textarea
                    id={`reason-${kind}-${id}`}
                    name="reason"
                    minLength={5}
                    maxLength={200}
                    required
                    rows={2}
                    placeholder="Explicá por qué se retira este contenido..."
                    className="w-full rounded-xl border border-red-400/30 bg-[#0b0b0d] p-3 text-sm text-white"
                />

                <button
                    type="submit"
                    className="rounded-full border border-red-400/50 px-5 py-2 text-sm text-red-300"
                >
                    Confirmar eliminación
                </button>
            </form>
        </details>
    );
}
