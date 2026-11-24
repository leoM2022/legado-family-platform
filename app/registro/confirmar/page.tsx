
import Link from "next/link";

export default function ConfirmRegisterPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-6 text-white">
            <div className="max-w-lg rounded-2xl border border-[#d4af37]/25 bg-[#18171b] p-10 text-center">
                <div className="mb-6 text-5xl">✉️</div>

                <h1 className="font-serif text-3xl text-[#e6c785]">
                    Revisá tu correo
                </h1>

                <p className="mt-6 leading-7 text-white/65">
                    Si el registro se procesó correctamente,
                    recibirás un enlace para confirmar tu dirección.
                </p>

                <p className="mt-4 leading-7 text-white/65">
                    Después de confirmar tu correo, ingresá con
                    tu contraseña. Tu cuenta permanecerá pendiente
                    hasta que el administrador la apruebe.
                </p>

                <Link
                    href="/login"
                    className="mt-8 inline-block rounded-full bg-[#d4af37] px-8 py-3 font-semibold text-black"
                >
                    Ir al login
                </Link>
            </div>
        </main>
    );
}
