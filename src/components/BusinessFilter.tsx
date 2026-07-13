import Link from "next/link";
import type { Business } from "@/lib/types";

export function BusinessFilter({
  businesses,
  activeBusinessId,
  basePath,
  extraParams,
}: {
  businesses: Business[];
  activeBusinessId?: string;
  basePath: string;
  extraParams?: Record<string, string | undefined>;
}) {
  if (businesses.length <= 1) return null;

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtro por negocio">
      <FilterLink href={buildFilterHref(basePath, extraParams)} active={!activeBusinessId}>
        Todos
      </FilterLink>
      {businesses.map((business) => (
        <FilterLink
          key={business.id}
          href={buildFilterHref(basePath, { ...extraParams, business: business.id })}
          active={activeBusinessId === business.id}
        >
          {business.name}
        </FilterLink>
      ))}
    </nav>
  );
}

function buildFilterHref(basePath: string, params: Record<string, string | undefined> = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }
  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 shrink-0 items-center rounded-md border px-3 text-sm font-semibold transition ${
        active
          ? "border-black bg-black text-white"
          : "border-black/10 bg-white text-[#3b392f] hover:border-black/30"
      }`}
    >
      {children}
    </Link>
  );
}
