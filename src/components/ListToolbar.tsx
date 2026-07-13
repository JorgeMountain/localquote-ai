import Link from "next/link";

export function ListToolbar({
  basePath,
  search,
  businessId,
  page,
  totalPages,
  placeholder = "Buscar cliente, telefono o negocio",
}: {
  basePath: string;
  search?: string;
  businessId?: string;
  page: number;
  totalPages: number;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-black/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <form action={basePath} className="flex min-w-0 flex-1 gap-2">
        {businessId && <input type="hidden" name="business" value={businessId} />}
        <input
          className="h-10 min-w-0 flex-1 rounded-md border border-black/15 px-3 text-sm"
          defaultValue={search ?? ""}
          maxLength={80}
          name="q"
          placeholder={placeholder}
        />
        <button className="h-10 rounded-md bg-black px-4 text-sm font-semibold text-white">Buscar</button>
      </form>
      <nav className="flex items-center gap-2 text-sm" aria-label="Paginacion">
        <PageLink
          disabled={page <= 1}
          href={buildPageHref(basePath, businessId, search, page - 1)}
          label="Anterior"
        />
        <span className="px-2 text-[#706d62]">
          {page} / {totalPages}
        </span>
        <PageLink
          disabled={page >= totalPages}
          href={buildPageHref(basePath, businessId, search, page + 1)}
          label="Siguiente"
        />
      </nav>
    </div>
  );
}

function PageLink({ href, label, disabled }: { href: string; label: string; disabled: boolean }) {
  if (disabled) {
    return <span className="rounded-md border border-black/10 px-3 py-2 text-black/35">{label}</span>;
  }
  return (
    <Link className="rounded-md border border-black/15 px-3 py-2 font-semibold hover:bg-[#f8f6f1]" href={href}>
      {label}
    </Link>
  );
}

function buildPageHref(basePath: string, businessId: string | undefined, search: string | undefined, page: number) {
  const params = new URLSearchParams();
  if (businessId) params.set("business", businessId);
  if (search?.trim()) params.set("q", search.trim());
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
