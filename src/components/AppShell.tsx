import Link from "next/link";
import {
  Bot,
  MessageCircle,
} from "lucide-react";
import { DesktopNavigation, MobileNavigation } from "@/components/AppNavigation";
import type { Profile } from "@/lib/types";

export function AppShell({ children, viewerProfile }: { children: React.ReactNode; viewerProfile?: Profile }) {
  const isPlatformAdmin = viewerProfile?.role === "platform_admin";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <MobileNavigation isPlatformAdmin={isPlatformAdmin} />
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-black/10 bg-[#f8f6f1] px-5 py-6 lg:block">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-[#111111] text-white">
            <Bot size={20} />
          </span>
          <span>
            <span className="block text-lg font-semibold">Tactio</span>
            <span className="text-xs uppercase tracking-[0.22em] text-[#6f6b61]">
              SaaS local
            </span>
          </span>
        </Link>

        <DesktopNavigation isPlatformAdmin={isPlatformAdmin} />

        <div className="absolute bottom-6 left-5 right-5 rounded-md border border-black/10 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageCircle size={16} />
            Flujo recomendado
          </div>
          <p className="mt-3 text-sm leading-6 text-[#6f6b61]">
            Configura negocio, precios, horarios, reglas y FAQs antes de probar WhatsApp.
          </p>
          {viewerProfile && (
            <p className="mt-3 rounded-md bg-[#f1eee6] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#4f4b42]">
              {viewerProfile.role === "platform_admin" ? "Admin plataforma" : "Perfil negocio"}
            </p>
          )}
        </div>
      </aside>

      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
