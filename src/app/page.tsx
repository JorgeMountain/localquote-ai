import { Bot, CalendarClock, CheckCircle2, FileText, MessageSquareText, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BusinessFilter } from "@/components/BusinessFilter";
import { MetricCard } from "@/components/MetricCard";
import { OnboardingPanel } from "@/components/OnboardingPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { currencyCop, currencyUsd, shortDate } from "@/lib/format";
import { getDashboardOverviewData, normalizeDashboardPeriodDays } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams?: Promise<{ business?: string; period?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const periodDays = normalizeDashboardPeriodDays(Number(params?.period));
  const data = await getDashboardOverviewData(supabase, user.id, {
    businessId: params?.business,
    periodDays,
  });
  const activeBusinessId = data.activeBusinessId;
  const scopedBusinesses = activeBusinessId
    ? data.businesses.filter((business) => business.id === activeBusinessId)
    : data.businesses;
  const customerById = new Map(data.customers.map((customer) => [customer.id, customer]));
  const businessById = new Map(data.businesses.map((business) => [business.id, business]));

  return (
    <AppShell viewerProfile={data.viewerProfile}>
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
            <BusinessFilter
              businesses={data.businesses}
              activeBusinessId={activeBusinessId}
              basePath="/"
              extraParams={{ period: String(data.periodDays) }}
            />
          </div>

          <section className="mt-5 flex flex-col gap-3 rounded-md border border-black/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Periodo de analisis</p>
              <p className="mt-1 text-sm text-[#706d62]">Las cifras se calculan con actividad ocurrida en este periodo.</p>
            </div>
            <div className="flex gap-2">
              {[7, 30, 90].map((days) => (
                <Link
                  key={days}
                  href={dashboardHref(days, activeBusinessId)}
                  className={`inline-flex h-10 items-center rounded-md border px-3 text-sm font-semibold ${
                    data.periodDays === days ? "border-black bg-black text-white" : "border-black/10 hover:border-black/30"
                  }`}
                >
                  {days} dias
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Clientes nuevos"
              value={String(data.newCustomersCount)}
              detail={`Leads creados en los ultimos ${data.periodDays} dias.`}
              icon={UsersRound}
            />
            <MetricCard
              label="Conversaciones"
              value={String(data.conversationsCount)}
              detail="Con actividad reciente por chat web o WhatsApp."
              icon={MessageSquareText}
            />
            <MetricCard
              label="Citas"
              value={`${data.pendingAppointmentsCount} / ${data.confirmedAppointmentsCount}`}
              detail="Pendientes / confirmadas en el periodo."
              icon={CalendarClock}
            />
            <MetricCard
              label="Cotizaciones"
              value={`${data.quotesSentCount} / ${data.quotesAcceptedCount}`}
              detail="Enviadas / aceptadas en el periodo."
              icon={FileText}
            />
            <MetricCard
              label="Conversion"
              value={`${data.conversionRate}%`}
              detail="Cotizaciones aceptadas frente a clientes nuevos."
              icon={CheckCircle2}
            />
            <MetricCard
              label="Costo IA estimado"
              value={currencyUsd(data.estimatedAiCost)}
              detail="Solo generaciones registradas; no incluye WhatsApp."
              icon={Bot}
            />
            <MetricCard
              label="Pipeline estimado"
              value={currencyCop(data.totalQuoted)}
              detail="No incluye cotizaciones rechazadas."
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
                      <th>Ultimo mensaje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    {data.conversations.map((conversation) => {
                      const customer = customerById.get(conversation.customerId);
                      const business = businessById.get(conversation.businessId);
                      return (
                        <tr key={conversation.id}>
                          <td className="py-4 font-medium">{customer?.name}</td>
                          <td>{business?.name}</td>
                          <td>{conversation.channel}</td>
                          <td>
                            <StatusBadge value={conversation.lastIntent} />
                          </td>
                          <td>{shortDate(conversation.lastMessageAt)}</td>
                        </tr>
                      );
                    })}
                    {data.conversations.length === 0 && (
                      <tr>
                        <td className="py-6 text-[#706d62]" colSpan={5}>
                          Aun no hay conversaciones en este periodo. Configura el negocio o abre el chat web para probar el flujo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-md border border-black/10 bg-[#111111] p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Negocios activos</h2>
                <Link href="/conversations" className="text-sm font-semibold text-[#e2f26b] underline-offset-4 hover:underline">
                  Gestionar leads
                </Link>
              </div>
              <div className="mt-5 space-y-4">
                {scopedBusinesses.map((business) => (
                  <article key={business.id} className="rounded-md border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{business.name}</p>
                        <p className="mt-1 text-sm text-white/65">{business.description}</p>
                      </div>
                      <span className="rounded-sm bg-[#e2f26b] px-2 py-1 text-xs font-semibold text-black">
                        {business.type === "dentist" ? "Salud" : "General"}
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

function dashboardHref(period: number, businessId?: string) {
  const searchParams = new URLSearchParams({ period: String(period) });
  if (businessId) searchParams.set("business", businessId);
  return `/?${searchParams.toString()}`;
}
