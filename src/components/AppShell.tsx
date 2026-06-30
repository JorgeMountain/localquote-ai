import Link from "next/link";
import {
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  Inbox,
  LayoutDashboard,
  MessageCircle,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/businesses", label: "Negocios y FAQs", icon: BriefcaseBusiness },
  { href: "/conversations", label: "Conversaciones", icon: Inbox },
  { href: "/appointments", label: "Citas", icon: CalendarClock },
  { href: "/quotes", label: "Cotizaciones", icon: FileText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-black/10 bg-[#f8f6f1] px-5 py-6 lg:block">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-[#111111] text-white">
            <Bot size={20} />
          </span>
          <span>
            <span className="block text-lg font-semibold">LocalQuote AI</span>
            <span className="text-xs uppercase tracking-[0.22em] text-[#6f6b61]">
              SaaS local
            </span>
          </span>
        </Link>

        <nav className="mt-10 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-[#3b392f] transition hover:bg-black hover:text-white"
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-5 right-5 rounded-md border border-black/10 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageCircle size={16} />
            Demo publico
          </div>
          <div className="mt-3 grid gap-2 text-sm">
            <Link className="underline-offset-4 hover:underline" href="/b/sonrisa-clara">
              /b/sonrisa-clara
            </Link>
            <Link className="underline-offset-4 hover:underline" href="/b/fixpro-tecnicos">
              /b/fixpro-tecnicos
            </Link>
          </div>
        </div>
      </aside>

      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
