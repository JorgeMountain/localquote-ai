import { redirect } from "next/navigation";
import { AppointmentStatusForm, QuickAppointmentButton } from "@/components/ActionForms";
import { AppShell } from "@/components/AppShell";
import { BusinessFilter } from "@/components/BusinessFilter";
import { OnboardingPanel } from "@/components/OnboardingPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { getDashboardData } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

type AppointmentsPageProps = {
  searchParams?: Promise<{ business?: string }>;
};

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
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
  const appointments = data.appointmentRequests.filter(
    (appointment) => !activeBusinessId || appointment.businessId === activeBusinessId,
  );

  return (
    <AppShell viewerProfile={data.viewerProfile}>
      <header className="mb-6 border-b border-black/10 pb-6">
        <h1 className="text-4xl font-semibold tracking-normal">Solicitudes de cita</h1>
        <p className="mt-2 text-[#706d62]">Agenda simple con confirmacion rapida para leads listos.</p>
      </header>

      {data.businesses.length === 0 ? (
        <OnboardingPanel userEmail={user.email} />
      ) : (
        <div className="grid gap-6">
          <BusinessFilter businesses={data.businesses} activeBusinessId={activeBusinessId} basePath="/appointments" />
          <div className="overflow-x-auto rounded-md border border-black/10 bg-white p-5">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-[#706d62]">
                <tr>
                  <th className="py-3">Cliente</th>
                  <th>Negocio</th>
                  <th>Servicio</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {appointments.map((appointment) => {
                  const customer = data.customers.find((item) => item.id === appointment.customerId);
                  const business = data.businesses.find((item) => item.id === appointment.businessId);
                  return (
                    <tr key={appointment.id} className="align-top">
                      <td className="py-4 font-medium">
                        {customer?.name}
                        <span className="block text-[#706d62]">{customer?.phone}</span>
                      </td>
                      <td>{business?.name}</td>
                      <td>{appointment.service}</td>
                      <td>
                        {appointment.preferredDate}
                        <span className="block text-[#706d62]">{appointment.preferredTime}</span>
                      </td>
                      <td>
                        <StatusBadge value={appointment.status} />
                      </td>
                      <td>
                        <div className="grid gap-3">
                          <AppointmentStatusForm id={appointment.id} status={appointment.status} />
                          {appointment.status !== "confirmed" && <QuickAppointmentButton id={appointment.id} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {appointments.length === 0 && (
                  <tr>
                    <td className="py-6 text-[#706d62]" colSpan={6}>
                      Sin solicitudes de cita para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
