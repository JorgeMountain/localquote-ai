import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/components/UpdatePasswordForm";
import { createClient } from "@/lib/supabase/server";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111111] p-4 text-white">
      <section className="w-full max-w-md rounded-md border border-white/10 bg-white p-6 text-[#171717]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#706d62]">Seguridad</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Cambiar contraseña</h1>
        <p className="mt-3 text-sm leading-6 text-[#706d62]">
          Define una contraseña nueva para acceder al panel de tu negocio.
        </p>
        <UpdatePasswordForm />
      </section>
    </main>
  );
}
