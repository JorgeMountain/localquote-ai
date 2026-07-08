import { AppShell } from "@/components/AppShell";
import { BusinessWorkspace } from "@/components/BusinessWorkspace";
import { OnboardingPanel } from "@/components/OnboardingPanel";
import { getDashboardData } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function BusinessesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getDashboardData(supabase, user.id);

  return (
    <AppShell viewerProfile={data.viewerProfile}>
      <Header title="Configurar bot" subtitle="Crea negocios reales y define que debe saber, decir y evitar el asistente." />
      {data.businesses.length === 0 && <OnboardingPanel userEmail={user.email} />}
      <div className="mt-6">
        <BusinessWorkspace
          businesses={data.businesses}
          profiles={data.profiles}
          viewerProfile={data.viewerProfile}
          faqs={data.faqs}
          businessHours={data.businessHours}
          availabilitySlots={data.availabilitySlots}
          businessLinks={data.businessLinks}
          whatsappBusinessSlug={process.env.WHATSAPP_DEFAULT_BUSINESS_SLUG ?? ""}
        />
      </div>
    </AppShell>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-6 border-b border-black/10 pb-6">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#706d62]">Setup del MVP</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-normal">{title}</h1>
      <p className="mt-2 max-w-2xl text-[#706d62]">{subtitle}</p>
    </header>
  );
}
