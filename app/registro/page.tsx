
import AuthForm from "@/components/auth/AuthForm";

export default function RegisterPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-6 py-16">
            <AuthForm mode="register" />
        </main>
    );
}
