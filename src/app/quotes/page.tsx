import { updateQuoteStatus } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { OnboardingPanel } from "@/components/OnboardingPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { currencyCop } from "@/lib/format";
import { getDashboardData } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function QuotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getDashboardData(supabase, user.id);

  return (
    <AppShell>
      <header className="mb-6 border-b border-black/10 pb-6">
        <h1 className="text-4xl font-semibold tracking-normal">Cotizaciones</h1>
        <p className="mt-2 text-[#706d62]">Estimados marcados para confirmacion del negocio.</p>
      </header>

      {data.businesses.length === 0 ? <OnboardingPanel userEmail={user.email} /> : <div className="grid gap-4">
        {data.quotes.map((quote) => {
          const customer = data.customers.find((item) => item.id === quote.customerId);
          return (
            <article key={quote.id} className="rounded-md border border-black/10 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{quote.service}</h2>
                  <p className="mt-1 text-sm text-[#706d62]">{customer?.name} - {quote.description}</p>
                </div>
                <div className="grid gap-2">
                  <StatusBadge value={quote.status} />
                  <form action={updateQuoteStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={quote.id} />
                    <select
                      className="h-9 rounded-md border border-black/15 bg-[#f8f6f1] px-2 text-sm"
                      name="status"
                      defaultValue={quote.status}
                    >
                      <option value="draft">Borrador</option>
                      <option value="sent">Enviada</option>
                      <option value="accepted">Aceptada</option>
                      <option value="rejected">Rechazada</option>
                    </select>
                    <button className="h-9 rounded-md bg-black px-3 text-sm font-semibold text-white">
                      Guardar
                    </button>
                  </form>
                </div>
              </div>
              <p className="mt-4 text-2xl font-semibold">
                {currencyCop(quote.minPrice)} - {currencyCop(quote.maxPrice)}
              </p>
              <p className="mt-2 text-sm text-[#706d62]">{quote.notes}</p>
            </article>
          );
        })}
      </div>}
    </AppShell>
  );
}
