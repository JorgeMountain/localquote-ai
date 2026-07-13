import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MetricCard } from "@/components/MetricCard";
import { getAdminPageData } from "@/lib/db";
import { currencyUsd, shortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { Bot, BriefcaseBusiness, MessageSquareText, ShieldCheck, UsersRound } from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getAdminPageData(supabase, user.id);
  if (data.viewerProfile.role !== "platform_admin") redirect("/");

  const ownerProfiles = data.profiles.filter((profile) => profile.role === "business_owner");
  const ownerById = new Map(data.profiles.map((profile) => [profile.id, profile]));
  const customerCounts = countByBusiness(data.customerBusinessIds);
  const appointmentCounts = countByBusiness(data.appointmentBusinessIds);
  const quoteCounts = countByBusiness(data.quoteBusinessIds);

  return (
    <AppShell viewerProfile={data.viewerProfile}>
      <header className="border-b border-black/10 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#706d62]">Admin plataforma</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-normal">Clientes, negocios y operación</h1>
        <p className="mt-2 max-w-2xl text-[#706d62]">
          Esta vista es para ti: muestra todos los negocios y usuarios de la plataforma.
        </p>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Negocios" value={String(data.businesses.length)} detail="Todos los negocios creados." icon={BriefcaseBusiness} />
        <MetricCard label="Dueños negocio" value={String(ownerProfiles.length)} detail="Usuarios tipo cliente." icon={UsersRound} />
        <MetricCard label="Conversaciones" value={String(data.conversationsCount)} detail="Web y WhatsApp." icon={MessageSquareText} />
        <MetricCard label="Admins" value={String(data.profiles.length - ownerProfiles.length)} detail="Usuarios plataforma." icon={ShieldCheck} />
        <MetricCard label="Costo IA reciente" value={currencyUsd(data.aiEstimatedCost)} detail="Ultimas 20 generaciones registradas." icon={Bot} />
        <MetricCard label="Alertas IA" value={String(data.aiFailureCount)} detail="Fallbacks por errores del proveedor." icon={ShieldCheck} />
      </section>

      <section className="mt-6 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-2xl font-semibold">Consumo y errores de IA</h2>
          <p className="mt-1 text-sm text-[#706d62]">
            Se registran proveedor, modelo, tokens, costo estimado y latencia. No se guardan prompts, respuestas ni llaves.
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase tracking-[0.14em] text-[#706d62]">
              <tr>
                <th className="py-3 pr-4">Fecha</th>
                <th className="py-3 pr-4">Proveedor / modelo</th>
                <th className="py-3 pr-4">Costo</th>
                <th className="py-3 pr-4">Latencia</th>
                <th className="py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.recentAiGenerations.map((generation) => (
                <tr key={`${generation.business_id}-${generation.created_at}-${generation.model}`} className="border-b border-black/5 align-top">
                  <td className="py-3 pr-4 text-[#706d62]">{shortDate(generation.created_at)}</td>
                  <td className="py-3 pr-4">
                    <p className="font-semibold">{generation.provider}</p>
                    <p className="text-xs text-[#706d62]">{generation.model}</p>
                  </td>
                  <td className="py-3 pr-4">{currencyUsd(Number(generation.estimated_cost || 0))}</td>
                  <td className="py-3 pr-4">{generation.latency_ms ?? 0} ms</td>
                  <td className="py-3">
                    <p className={generation.error_message ? "font-semibold text-red-700" : "font-semibold text-[#4d6419]"}>
                      {generation.error_message ?? generation.status}
                    </p>
                  </td>
                </tr>
              ))}
              {data.recentAiGenerations.length === 0 && (
                <tr>
                  <td className="py-5 text-[#706d62]" colSpan={5}>Aun no hay generaciones registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Usuarios de la plataforma</h2>
            <p className="mt-1 text-sm text-[#706d62]">
              Las contraseñas están cifradas por Supabase y no son visibles. Cada usuario puede restablecerla desde el acceso.
            </p>
          </div>
          <Link className="text-sm font-semibold underline underline-offset-4" href="/payments">
            Revisar comprobantes
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase tracking-[0.14em] text-[#706d62]">
              <tr>
                <th className="py-3 pr-4">Usuario</th>
                <th className="py-3 pr-4">Correo</th>
                <th className="py-3 pr-4">Perfil</th>
                <th className="py-3 pr-4">Negocios</th>
                <th className="py-3">Contraseña</th>
              </tr>
            </thead>
            <tbody>
              {data.profiles.map((profile) => {
                const profileBusinesses = data.businesses.filter((business) => business.ownerId === profile.id);
                return (
                  <tr key={profile.id} className="border-b border-black/5 align-top">
                    <td className="py-3 pr-4 font-semibold">{profile.fullName ?? "Sin nombre"}</td>
                    <td className="py-3 pr-4 text-[#706d62]">{profile.email ?? "Sin correo"}</td>
                    <td className="py-3 pr-4">
                      {profile.role === "platform_admin" ? "Administrador" : "Dueño de negocio"}
                    </td>
                    <td className="py-3 pr-4">
                      {profileBusinesses.length > 0
                        ? profileBusinesses.map((business) => business.name).join(", ")
                        : "Sin negocio asignado"}
                    </td>
                    <td className="py-3">
                      <span className="text-[#706d62]">
                        Protegida. El usuario la restablece desde la pantalla de acceso.
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold">Negocios registrados</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase tracking-[0.14em] text-[#706d62]">
              <tr>
                <th className="py-3 pr-4">Negocio</th>
                <th className="py-3 pr-4">Dueño</th>
                <th className="py-3 pr-4">Slug</th>
                <th className="py-3 pr-4">Leads</th>
                <th className="py-3 pr-4">Citas</th>
                <th className="py-3">Cotizaciones</th>
              </tr>
            </thead>
            <tbody>
              {data.businesses.map((business) => {
                const owner = ownerById.get(business.ownerId);
                return (
                  <tr key={business.id} className="border-b border-black/5">
                    <td className="py-3 pr-4 font-semibold">{business.name}</td>
                    <td className="py-3 pr-4 text-[#706d62]">{owner?.email ?? owner?.fullName ?? business.ownerId}</td>
                    <td className="py-3 pr-4 text-[#706d62]">{business.slug}</td>
                    <td className="py-3 pr-4">{customerCounts.get(business.id) ?? 0}</td>
                    <td className="py-3 pr-4">{appointmentCounts.get(business.id) ?? 0}</td>
                    <td className="py-3">{quoteCounts.get(business.id) ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function countByBusiness(businessIds: string[]) {
  const counts = new Map<string, number>();
  for (const businessId of businessIds) counts.set(businessId, (counts.get(businessId) ?? 0) + 1);
  return counts;
}
