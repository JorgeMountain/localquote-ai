import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111111] p-4 text-white">
      <section className="w-full max-w-md rounded-md border border-white/10 bg-white p-6 text-[#171717]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#706d62]">Demo auth</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Entrar a LocalQuote AI</h1>
        <div className="mt-6 grid gap-3">
          <input className="h-11 rounded-md border border-black/15 px-3 text-sm" defaultValue="owner@localquote.ai" />
          <input className="h-11 rounded-md border border-black/15 px-3 text-sm" defaultValue="demo-password" type="password" />
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md bg-black px-4 text-sm font-semibold text-white"
          >
            Entrar al dashboard
          </Link>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#706d62]">
          Supabase Auth queda listo para conectar con las variables documentadas en el README.
        </p>
      </section>
    </main>
  );
}
