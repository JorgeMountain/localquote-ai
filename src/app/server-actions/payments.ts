"use server";

import { revalidatePath } from "next/cache";
import { withActionFeedback, type ActionState } from "@/lib/action-state";
import { getAuthenticatedClient, getViewerProfile } from "@/lib/server/auth";
import type { PaymentReceiptStatus } from "@/lib/types";
import { optionalText, requiredUuid } from "@/lib/validation";

export async function updatePaymentReceiptStatusWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const status = parsePaymentReceiptStatus(String(formData.get("status") ?? ""));
  const labels: Record<PaymentReceiptStatus, string> = {
    pending: "Comprobante marcado como pendiente.",
    approved: "Pago aprobado.",
    rejected: "Comprobante rechazado.",
  };
  return withActionFeedback(() => updatePaymentReceiptStatus(formData, status), labels[status]);
}

async function updatePaymentReceiptStatus(formData: FormData, status: PaymentReceiptStatus) {
  const { supabase, user } = await getAuthenticatedClient();
  const viewerProfile = await getViewerProfile(supabase, user.id);
  if (viewerProfile.role !== "platform_admin") throw new Error("Acceso exclusivo del administrador.");
  const { error } = await supabase
    .from("payment_receipts")
    .update({
      status,
      review_notes: optionalText(formData, "review_notes", "Nota de revision", 1000),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requiredUuid(formData, "id", "Comprobante"))
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/payments");
  revalidatePath("/admin");
}

function parsePaymentReceiptStatus(value: string): PaymentReceiptStatus {
  return value === "approved" || value === "rejected" ? value : "pending";
}
