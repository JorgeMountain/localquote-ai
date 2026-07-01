import { AppShell } from "@/components/AppShell";
import { OnboardingPanel } from "@/components/OnboardingPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { getDashboardData } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getDashboardData(supabase, user.id);

  return (
    <AppShell>
      <header className="mb-6 border-b border-black/10 pb-6">
        <h1 className="text-4xl font-semibold tracking-normal">Solicitudes de cita</h1>
        <p className="mt-2 text-[#706d62]">Agenda simple sin calendario externo.</p>
      </header>

      {data.businesses.length === 0 ? <OnboardingPanel userEmail={user.email} /> : <div className="rounded-md border border-black/10 bg-white p-5">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.18em] text-[#706d62]">
            <tr>
              <th className="py-3">Cliente</th>
              <th>Servicio</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {data.appointmentRequests.map((appointment) => {
              const customer = data.customers.find((item) => item.id === appointment.customerId);
              return (
                <tr key={appointment.id}>
                  <td className="py-4 font-medium">{customer?.name}</td>
                  <td>{appointment.service}</td>
                  <td>{appointment.preferredDate}</td>
                  <td>{appointment.preferredTime}</td>
                  <td>
                    <StatusBadge value={appointment.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>}
    </AppShell>
  );
}
