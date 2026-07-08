import { ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";
import { PaymentReceiptStatusForm } from "@/components/ActionForms";
import { AppShell } from "@/components/AppShell";
import { BusinessSelectFilter } from "@/components/BusinessSelectFilter";
import { OnboardingPanel } from "@/components/OnboardingPanel";
import { PaymentReceiptUploader } from "@/components/PaymentReceiptUploader";
import { StatusBadge } from "@/components/StatusBadge";
import { getDashboardData } from "@/lib/db";
import { currencyCop, shortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type PaymentsPageProps = {
  searchParams?: Promise<{ business?: string }>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
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
  const receipts = data.paymentReceipts.filter(
    (receipt) => !activeBusinessId || receipt.businessId === activeBusinessId,
  );
  const receiptUrls = new Map(
    await Promise.all(
      receipts.map(async (receipt) => {
        const { data: signedData } = await supabase.storage
          .from("payment-receipts")
          .createSignedUrl(receipt.objectPath, 60 * 10);
        return [receipt.id, signedData?.signedUrl] as const;
      }),
    ),
  );
  const isAdmin = data.viewerProfile.role === "platform_admin";

  return (
    <AppShell viewerProfile={data.viewerProfile}>
      <header className="mb-6 border-b border-black/10 pb-6">
        <h1 className="text-4xl font-semibold tracking-normal">Pagos y comprobantes</h1>
        <p className="mt-2 text-[#706d62]">
          {isAdmin
            ? "Revisa qué clientes pagaron y aprueba o rechaza sus comprobantes."
            : "Sube tu comprobante para que el administrador valide el pago."}
        </p>
      </header>

      {data.businesses.length === 0 ? (
        <OnboardingPanel userEmail={user.email} />
      ) : (
        <div className="grid gap-6">
          <PaymentReceiptUploader businesses={data.businesses} defaultBusinessId={activeBusinessId} />
          <BusinessSelectFilter
            businesses={data.businesses}
            activeBusinessId={activeBusinessId}
            basePath="/payments"
            allLabel="Todos los comprobantes"
          />

          <section className="overflow-x-auto rounded-xl border border-black/10 bg-white p-5 shadow-sm">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-[#706d62]">
                <tr>
                  <th className="py-3 pr-4">Negocio</th>
                  <th className="pr-4">Periodo</th>
                  <th className="pr-4">Valor</th>
                  <th className="pr-4">Comprobante</th>
                  <th className="pr-4">Estado</th>
                  <th>Revisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {receipts.map((receipt) => {
                  const business = data.businesses.find((item) => item.id === receipt.businessId);
                  const signedUrl = receiptUrls.get(receipt.id);
                  return (
                    <tr key={receipt.id} className="align-top">
                      <td className="py-4 pr-4 font-semibold">
                        {business?.name}
                        <span className="mt-1 block font-normal text-[#706d62]">{shortDate(receipt.createdAt)}</span>
                      </td>
                      <td className="py-4 pr-4">{receipt.billingPeriod ?? "No indicado"}</td>
                      <td className="py-4 pr-4">
                        {receipt.amountCents === undefined ? "No indicado" : currencyCop(receipt.amountCents / 100)}
                      </td>
                      <td className="py-4 pr-4">
                        {signedUrl ? (
                          <a
                            className="inline-flex items-center gap-2 font-semibold underline underline-offset-4"
                            href={signedUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <ExternalLink size={15} />
                            Ver archivo
                          </a>
                        ) : (
                          "No disponible"
                        )}
                        <span className="mt-1 block max-w-52 truncate text-[#706d62]">{receipt.originalName}</span>
                        {receipt.notes && <span className="mt-1 block text-[#706d62]">{receipt.notes}</span>}
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge value={receipt.status} />
                        {receipt.reviewNotes && (
                          <span className="mt-2 block max-w-56 text-[#706d62]">{receipt.reviewNotes}</span>
                        )}
                      </td>
                      <td className="py-4">
                        {isAdmin ? (
                          <PaymentReceiptStatusForm
                            id={receipt.id}
                            status={receipt.status}
                            reviewNotes={receipt.reviewNotes}
                          />
                        ) : (
                          <span className="text-[#706d62]">Solo el administrador valida el pago.</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {receipts.length === 0 && (
                  <tr>
                    <td className="py-6 text-[#706d62]" colSpan={6}>
                      Todavía no hay comprobantes para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </AppShell>
  );
}
