import { CalendarClock, FileText, MessageSquareText, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BusinessFilter } from "@/components/BusinessFilter";
import { MetricCard } from "@/components/MetricCard";
import { OnboardingPanel } from "@/components/OnboardingPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { currencyCop, shortDate } from "@/lib/format";
import { getDashboardData } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams?: Promise<{ business?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
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
  const scopedBusinesses = activeBusinessId
    ? data.businesses.filter((business) => business.id === activeBusinessId)
    : data.businesses;
  const scopedCustomers = data.customers.filter((customer) => !activeBusinessId || customer.businessId === activeBusinessId);
  const scopedConversations = data.conversations.filter(
    (conversation) => !activeBusinessId || conversation.businessId === activeBusinessId,
  );
  const scopedAppointments = data.appointmentRequests.filter(
    (appointment) => !activeBusinessId || appointment.businessId === activeBusinessId,
  );
  const scopedQuotes = data.quotes.filter((quote) => !activeBusinessId || quote.businessId === activeBusinessId);
  const totalQuoted = scopedQuotes.reduce((sum, quote) => sum + quote.maxPrice, 0);

  return (
    <AppShell>
      {data.businesses.length === 0 ? (
        <OnboardingPanel userEmail={user.email} />
      ) : (
        <>
          <header className="flex flex-col gap-4 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#706d62]">
                Dashboard privado
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-5xl">
                Leads, citas y cotizaciones en un solo tablero
              </h1>
            </div>
            <Link
              href="/businesses"
              className="inline-flex h-11 items-center justify-center rounded-md bg-black px-4 text-sm font-semibold text-white"
            >
              Configurar negocio
            </Link>
          </header>

          <div className="mt-5">
            <BusinessFilter businesses={data.businesses} activeBusinessId={activeBusinessId} basePath="/" />
          </div>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Clientes nuevos"
              value={String(scopedCustomers.length)}
              detail="Capturados desde chat web y Supabase."
              icon={UsersRound}
            />
            <MetricCard
              label="Conversaciones"
              value={String(scopedConversations.length)}
              detail="Historial por negocio y canal."
              icon={MessageSquareText}
            />
            <MetricCard
              label="Citas pendientes"
              value={String(scopedAppointments.filter((item) => item.status === "pending").length)}
              detail="Sin calendario externo en esta fase."
              icon={CalendarClock}
            />
            <MetricCard
              label="Pipeline estimado"
              value={currencyCop(totalQuoted)}
              detail="Suma de cotizaciones maximas."
              icon={FileText}
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-md border border-black/10 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">Conversaciones recientes</h2>
                <Link href="/conversations" className="text-sm font-semibold underline-offset-4 hover:underline">
                  Ver todas
                </Link>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.18em] text-[#706d62]">
                    <tr>
                      <th className="py-3">Cliente</th>
                      <th>Negocio</th>
                      <th>Canal</th>
                      <th>Intencion</th>
                      <th>Creada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    {scopedConversations.map((conversation) => {
                      const customer = data.customers.find((item) => item.id === conversation.customerId);
                      const business = data.businesses.find((item) => item.id === conversation.businessId);
                      return (
                        <tr key={conversation.id}>
                          <td className="py-4 font-medium">{customer?.name}</td>
                          <td>{business?.name}</td>
                          <td>{conversation.channel}</td>
                          <td>
                            <StatusBadge value={conversation.lastIntent} />
                          </td>
                          <td>{shortDate(conversation.createdAt)}</td>
                        </tr>
                      );
                    })}
                    {scopedConversations.length === 0 && (
                      <tr>
                        <td className="py-6 text-[#706d62]" colSpan={5}>
                          Sin conversaciones para este filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-md border border-black/10 bg-[#111111] p-5 text-white">
              <h2 className="text-xl font-semibold">Negocios activos</h2>
              <div className="mt-5 space-y-4">
                {scopedBusinesses.map((business) => (
                  <article key={business.id} className="rounded-md border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{business.name}</p>
                        <p className="mt-1 text-sm text-white/65">{business.description}</p>
                      </div>
                      <span className="rounded-sm bg-[#e2f26b] px-2 py-1 text-xs font-semibold text-black">
                        {business.type === "dentist" ? "Odonto" : "Tecnico"}
                      </span>
                    </div>
                    <Link
                      href={`/b/${business.slug}`}
                      className="mt-4 inline-flex text-sm font-semibold text-[#e2f26b] underline-offset-4 hover:underline"
                    >
                      Abrir chat publico
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
