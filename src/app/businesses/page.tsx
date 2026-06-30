import { AppShell } from "@/components/AppShell";
import { BusinessWorkspace } from "@/components/BusinessWorkspace";
import { getSnapshot } from "@/lib/store";

export default function BusinessesPage() {
  const data = getSnapshot();

  return (
    <AppShell>
      <Header title="Negocios y FAQs" subtitle="Configura la informacion que limita y guia las respuestas de IA." />
      <BusinessWorkspace businesses={data.businesses} faqs={data.faqs} />
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
