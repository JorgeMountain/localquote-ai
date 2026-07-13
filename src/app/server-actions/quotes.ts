"use server";

import { revalidatePath } from "next/cache";
import { withActionFeedback, type ActionState } from "@/lib/action-state";
import { notifyCustomer } from "@/lib/customer-notifications";
import { getAuthenticatedClient } from "@/lib/server/auth";
import {
  getWhatsAppDeliveryContext,
  revalidateCommercialPaths,
  setDeliveryFailed,
  setDeliveryPending,
} from "@/lib/server/commercial-delivery";
import type { QuoteStatus } from "@/lib/types";
import { requiredUuid } from "@/lib/validation";

export async function updateQuoteStatusWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  const status = parseQuoteStatus(String(formData.get("status") ?? ""));
  const labels: Record<QuoteStatus, string> = {
    draft: "Cotizacion marcada como borrador.",
    sent: "Cotizacion marcada como enviada manualmente; no se envio un mensaje.",
    accepted: "Cotizacion aceptada.",
    rejected: "Cotizacion rechazada.",
  };
  return withActionFeedback(() => updateQuoteStatus(formData, status), labels[status]);
}

export async function sendQuoteAndNotifyWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withActionFeedback(
    () => sendQuoteAndNotify(requiredUuid(formData, "id", "Cotizacion")),
    "Cotizacion enviada al cliente por WhatsApp.",
  );
}

async function updateQuoteStatus(formData: FormData, status: QuoteStatus) {
  const { supabase } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("quotes")
    .update({ status })
    .eq("id", requiredUuid(formData, "id", "Cotizacion"))
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/quotes");
  revalidatePath("/conversations");
}

async function sendQuoteAndNotify(id: string) {
  const { supabase } = await getAuthenticatedClient();
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id,business_id,customer_id,conversation_id,service,description,min_price,max_price,notes")
    .eq("id", id)
    .single();
  if (error || !quote) throw error ?? new Error("Cotizacion no encontrada.");
  const delivery = await getWhatsAppDeliveryContext(
    supabase,
    quote.business_id,
    quote.customer_id,
    quote.conversation_id,
  );
  await setDeliveryPending(supabase, "quotes", quote.id);

  let providerMessageId: string;
  try {
    const result = await notifyCustomer({
      type: "quote",
      customerName: delivery.customer.name,
      customerPhone: delivery.customer.phone,
      businessName: delivery.business.name,
      sourcePhoneNumberId: delivery.business.whatsapp_phone_number_id ?? undefined,
      service: quote.service,
      description: quote.description,
      minPrice: quote.min_price,
      maxPrice: quote.max_price,
      notes: quote.notes,
    });
    providerMessageId = result.providerMessageId;
  } catch (sendError) {
    await setDeliveryFailed(supabase, "quotes", quote.id, sendError);
    throw new Error("No se pudo enviar la cotizacion. Se conservo su estado anterior.");
  }

  const { error: updateError } = await supabase
    .from("quotes")
    .update({
      status: "sent",
      delivery_status: "sent",
      sent_at: new Date().toISOString(),
      error_message: null,
      provider_message_id: providerMessageId,
    })
    .eq("id", quote.id)
    .select("id")
    .single();
  if (updateError) throw new Error("El mensaje fue enviado, pero no se pudo guardar el estado de la cotizacion.");
  revalidateCommercialPaths();
}

function parseQuoteStatus(value: string): QuoteStatus {
  return value === "sent" || value === "accepted" || value === "rejected" ? value : "draft";
}
