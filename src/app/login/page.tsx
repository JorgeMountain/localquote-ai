import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111111] p-4 text-white">
      <section className="w-full max-w-md rounded-md border border-white/10 bg-white p-6 text-[#171717]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#706d62]">Supabase Auth</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Entrar a Tactio</h1>
        <AuthForm />
        <p className="mt-4 text-sm leading-6 text-[#706d62]">
          El registro crea un perfil en Supabase y el dashboard queda protegido por sesion.
        </p>
      </section>
    </main>
  );
}
