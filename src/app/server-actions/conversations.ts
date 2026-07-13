"use server";

import { revalidatePath } from "next/cache";
import { withActionFeedback, type ActionState } from "@/lib/action-state";
import { getAuthenticatedClient } from "@/lib/server/auth";
import type { LeadStatus } from "@/lib/types";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { optionalText, requiredText, requiredUuid } from "@/lib/validation";

export async function updateCustomerStatusWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const status = parseLeadStatus(String(formData.get("status") ?? ""));
  const labels: Record<LeadStatus, string> = {
    new: "Lead marcado como nuevo.",
    qualified: "Lead calificado.",
    appointment: "Lead marcado con cita.",
    quoted: "Lead marcado como cotizado.",
  };
  return withActionFeedback(() => updateCustomerStatus(formData, status), labels[status]);
}

async function updateCustomerStatus(formData: FormData, status: LeadStatus) {
  const { supabase } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("customers")
    .update({ status })
    .eq("id", requiredUuid(formData, "id", "Cliente"))
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/conversations");
}

function parseLeadStatus(value: string): LeadStatus {
  return value === "qualified" || value === "appointment" || value === "quoted" ? value : "new";
}

export async function markConversationReadWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withActionFeedback(() => markConversationRead(formData), "Conversacion marcada como leida.");
}

async function markConversationRead(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("conversations")
    .update({ last_read_at: new Date().toISOString() })
    .eq("id", requiredUuid(formData, "conversation_id", "Conversacion"))
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/conversations");
}

export async function saveConversationDetailsWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withActionFeedback(() => saveConversationDetails(formData), "Notas y etiquetas actualizadas.");
}

async function saveConversationDetails(formData: FormData) {
  const conversationId = requiredUuid(formData, "conversation_id", "Conversacion");
  const internalNotes = optionalText(formData, "internal_notes", "Notas internas", 2000);
  const tags = parseConversationTags(optionalText(formData, "tags", "Etiquetas", 500));
  const { supabase } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("conversations")
    .update({ internal_notes: internalNotes, tags })
    .eq("id", conversationId)
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/conversations");
}

export async function sendManualReplyWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withActionFeedback(() => sendManualReply(formData), "Respuesta manual enviada y guardada.");
}

async function sendManualReply(formData: FormData) {
  const conversationId = requiredUuid(formData, "conversation_id", "Conversacion");
  const body = requiredText(formData, "body", "Respuesta", 4000);
  const { supabase } = await getAuthenticatedClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id,business_id,customer_id,channel")
    .eq("id", conversationId)
    .single();
  if (conversationError || !conversation) throw conversationError ?? new Error("Conversacion no encontrada.");

  if (conversation.channel === "whatsapp") {
    const [customerResult, businessResult] = await Promise.all([
      supabase.from("customers").select("phone").eq("id", conversation.customer_id).single(),
      supabase.from("businesses").select("whatsapp_phone_number_id").eq("id", conversation.business_id).single(),
    ]);
    if (customerResult.error || !customerResult.data) {
      throw customerResult.error ?? new Error("Cliente no encontrado.");
    }
    if (businessResult.error || !businessResult.data) {
      throw businessResult.error ?? new Error("Negocio no encontrado.");
    }
    await sendWhatsAppText(
      customerResult.data.phone,
      body,
      businessResult.data.whatsapp_phone_number_id ?? undefined,
    );
  }

  const { error: messageError } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role: "assistant", body });
  if (messageError) throw messageError;
  revalidatePath("/");
  revalidatePath("/conversations");
}

function parseConversationTags(value: string) {
  const tags = [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
  if (tags.length > 10) throw new Error("Puedes guardar hasta 10 etiquetas.");
  if (tags.some((tag) => tag.length > 32)) throw new Error("Cada etiqueta puede tener hasta 32 caracteres.");
  return tags;
}
