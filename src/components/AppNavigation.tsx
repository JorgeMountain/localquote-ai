"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  Inbox,
  LayoutDashboard,
  Menu,
  ReceiptText,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { isActiveAppRoute } from "@/lib/navigation";

type NavigationProps = {
  isPlatformAdmin: boolean;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

function getNavigationItems(isPlatformAdmin: boolean): NavigationItem[] {
  const items: NavigationItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/businesses", label: "Configurar bot", icon: BriefcaseBusiness },
    { href: "/conversations", label: "Conversaciones", icon: Inbox },
    { href: "/appointments", label: "Citas", icon: CalendarClock },
    { href: "/quotes", label: "Cotizaciones", icon: FileText },
    { href: "/payments", label: "Pagos", icon: ReceiptText },
  ];

  return isPlatformAdmin ? [...items, { href: "/admin", label: "Admin", icon: ShieldCheck }] : items;
}

export function DesktopNavigation({ isPlatformAdmin }: NavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="mt-10 space-y-1" aria-label="Navegacion principal">
      {getNavigationItems(isPlatformAdmin).map((item) => {
        const active = isActiveAppRoute(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
              active ? "bg-black text-white" : "text-[#3b392f] hover:bg-black hover:text-white"
            }`}
          >
            <item.icon size={17} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavigation({ isPlatformAdmin }: NavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f8f6f1]/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold" onClick={() => setIsOpen(false)}>
          Tactio
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex size-10 items-center justify-center rounded-md border border-black/15 bg-white text-black"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "Cerrar menu" : "Abrir menu"}
        >
          {isOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {isOpen && (
        <nav id="mobile-navigation" className="border-t border-black/10 bg-[#f8f6f1] px-4 py-3 shadow-lg" aria-label="Navegacion movil">
          <div className="mx-auto grid max-w-7xl gap-1 sm:px-2">
            {getNavigationItems(isPlatformAdmin).map((item) => {
              const active = isActiveAppRoute(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold ${
                    active ? "bg-black text-white" : "text-[#3b392f] hover:bg-black/5"
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
