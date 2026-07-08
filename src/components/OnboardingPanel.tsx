import { LogOut, MousePointerClick } from "lucide-react";
import { signOut } from "@/app/actions";

export function OnboardingPanel({ userEmail }: { userEmail?: string }) {
  return (
    <section className="rounded-md border border-black/10 bg-white p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#706d62]">Supabase conectado</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-5xl">
            Crea tu primer negocio manualmente
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#706d62]">
            Sesion activa{userEmail ? `: ${userEmail}` : ""}. La base quedo limpia para que agregues datos reales:
            servicios, precios, horarios, reglas del bot y preguntas frecuentes.
          </p>
        </div>

        <div className="flex gap-2">
          <a href="#crear-negocio" className="inline-flex h-11 items-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white">
            <MousePointerClick size={17} />
            Ir al formulario
          </a>
          <form action={signOut}>
            <button className="inline-flex size-11 items-center justify-center rounded-md border border-black/15 bg-white" aria-label="Salir">
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
