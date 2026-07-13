import { redirect } from "next/navigation";
import { QuickQuoteAcceptedButton, QuickQuoteSentButton, QuoteStatusForm } from "@/components/ActionForms";
import { AppShell } from "@/components/AppShell";
import { BusinessFilter } from "@/components/BusinessFilter";
import { OnboardingPanel } from "@/components/OnboardingPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { currencyCop } from "@/lib/format";
import { getDashboardData } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

type QuotesPageProps = {
  searchParams?: Promise<{ business?: string }>;
};

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const data = await getDashboardData(supabase, user.id);
  const activeBusinessId = data.businesses.some((business) => business.id === params?.business)
    ? params?.business
    : undefined;
  const quotes = data.quotes.filter((quote) => !activeBusinessId || quote.businessId === activeBusinessId);

  return (
    <AppShell viewerProfile={data.viewerProfile}>
      <header className="mb-6 border-b border-black/10 pb-6">
        <h1 className="text-4xl font-semibold tracking-normal">Cotizaciones</h1>
        <p className="mt-2 text-[#706d62]">Pipeline editable para enviar, aceptar o revisar estimados.</p>
      </header>

      {data.businesses.length === 0 ? (
        <OnboardingPanel userEmail={user.email} />
      ) : (
        <div className="grid gap-6">
          <BusinessFilter businesses={data.businesses} activeBusinessId={activeBusinessId} basePath="/quotes" />
          <div className="grid gap-4">
            {quotes.map((quote) => {
              const customer = data.customers.find((item) => item.id === quote.customerId);
              const business = data.businesses.find((item) => item.id === quote.businessId);
              return (
                <article key={quote.id} className="rounded-md border border-black/10 bg-white p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{quote.service}</h2>
                        <StatusBadge value={quote.status} />
                        <span className="text-xs text-[#706d62]">Entrega:</span>
                        <StatusBadge value={quote.deliveryStatus} />
                      </div>
                      <p className="mt-1 text-sm text-[#706d62]">
                        {customer?.name} - {business?.name}
                      </p>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#37342c]">{quote.description}</p>
                      {quote.sentAt && (
                        <p className="mt-2 text-xs text-[#706d62]">
                          Enviada {new Date(quote.sentAt).toLocaleString("es-CO")}
                        </p>
                      )}
                      {quote.errorMessage && (
                        <p className="mt-2 text-sm text-red-700">No entregada. Revisa la configuracion de WhatsApp.</p>
                      )}
                    </div>
                    <div className="grid gap-3 lg:min-w-72">
                      <QuoteStatusForm id={quote.id} status={quote.status} />
                      <div className="flex flex-wrap gap-2">
                        {quote.status !== "sent" && <QuickQuoteSentButton id={quote.id} />}
                        {quote.status !== "accepted" && <QuickQuoteAcceptedButton id={quote.id} />}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-2xl font-semibold">
                    {currencyCop(quote.minPrice)} - {currencyCop(quote.maxPrice)}
                  </p>
                  <p className="mt-2 text-sm text-[#706d62]">{quote.notes}</p>
                </article>
              );
            })}
            {quotes.length === 0 && (
              <p className="rounded-md border border-dashed border-black/15 bg-white p-5 text-sm text-[#706d62]">
                Sin cotizaciones para este filtro.
              </p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
