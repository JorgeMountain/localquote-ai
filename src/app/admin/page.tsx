import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { MetricCard } from "@/components/MetricCard";
import { getDashboardData } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { BriefcaseBusiness, MessageSquareText, ShieldCheck, UsersRound } from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getDashboardData(supabase, user.id);
  if (data.viewerProfile.role !== "platform_admin") redirect("/");

  const ownerProfiles = data.profiles.filter((profile) => profile.role === "business_owner");
  const ownerById = new Map(data.profiles.map((profile) => [profile.id, profile]));

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
        <MetricCard label="Conversaciones" value={String(data.conversations.length)} detail="Web y WhatsApp." icon={MessageSquareText} />
        <MetricCard label="Admins" value={String(data.profiles.length - ownerProfiles.length)} detail="Usuarios plataforma." icon={ShieldCheck} />
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
                    <td className="py-3 pr-4">{data.customers.filter((customer) => customer.businessId === business.id).length}</td>
                    <td className="py-3 pr-4">
                      {data.appointmentRequests.filter((appointment) => appointment.businessId === business.id).length}
                    </td>
                    <td className="py-3">{data.quotes.filter((quote) => quote.businessId === business.id).length}</td>
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
