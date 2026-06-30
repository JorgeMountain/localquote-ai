import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { currencyCop } from "@/lib/format";
import { getCustomer, getSnapshot } from "@/lib/store";

export default function QuotesPage() {
  const data = getSnapshot();

  return (
    <AppShell>
      <header className="mb-6 border-b border-black/10 pb-6">
        <h1 className="text-4xl font-semibold tracking-normal">Cotizaciones</h1>
        <p className="mt-2 text-[#706d62]">Estimados marcados para confirmacion del negocio.</p>
      </header>

      <div className="grid gap-4">
        {data.quotes.map((quote) => {
          const customer = getCustomer(quote.customerId);
          return (
            <article key={quote.id} className="rounded-md border border-black/10 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{quote.service}</h2>
                  <p className="mt-1 text-sm text-[#706d62]">{customer?.name} - {quote.description}</p>
                </div>
                <StatusBadge value={quote.status} />
              </div>
              <p className="mt-4 text-2xl font-semibold">
                {currencyCop(quote.minPrice)} - {currencyCop(quote.maxPrice)}
              </p>
              <p className="mt-2 text-sm text-[#706d62]">{quote.notes}</p>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
