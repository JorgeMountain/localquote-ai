import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type DeliveryTable = "appointment_requests" | "quotes";

export async function getWhatsAppDeliveryContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  customerId: string,
  conversationId: string | null,
) {
  if (!conversationId) {
    throw new Error("Este registro no tiene una conversacion asociada; no se enviara automaticamente.");
  }

  const [businessResult, customerResult, conversationResult] = await Promise.all([
    supabase.from("businesses").select("id,name,whatsapp_phone_number_id").eq("id", businessId).single(),
    supabase.from("customers").select("id,name,phone").eq("id", customerId).single(),
    supabase
      .from("conversations")
      .select("id,channel")
      .eq("id", conversationId)
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .single(),
  ]);
  if (businessResult.error || !businessResult.data) throw businessResult.error ?? new Error("Negocio no encontrado.");
  if (customerResult.error || !customerResult.data) throw customerResult.error ?? new Error("Cliente no encontrado.");
  if (conversationResult.error || !conversationResult.data) {
    throw conversationResult.error ?? new Error("Conversacion no encontrada.");
  }
  if (conversationResult.data.channel !== "whatsapp") {
    throw new Error("El cliente no llego por un canal de WhatsApp valido; no se enviara automaticamente.");
  }
  return { business: businessResult.data, customer: customerResult.data };
}

export async function setDeliveryPending(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: DeliveryTable,
  id: string,
) {
  const { error } = await supabase
    .from(table)
    .update({ delivery_status: "pending", sent_at: null, error_message: null, provider_message_id: null })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw error;
}

export async function setDeliveryFailed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: DeliveryTable,
  id: string,
  error: unknown,
) {
  const errorMessage = error instanceof Error ? error.message : "Error desconocido de WhatsApp.";
  const { error: updateError } = await supabase
    .from(table)
    .update({ delivery_status: "failed", sent_at: null, error_message: errorMessage.slice(0, 1500), provider_message_id: null })
    .eq("id", id);
  if (updateError) console.error("Could not persist WhatsApp delivery failure.", updateError);
}

export function revalidateCommercialPaths() {
  revalidatePath("/");
  revalidatePath("/appointments");
  revalidatePath("/quotes");
  revalidatePath("/conversations");
}
