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
import type { AppointmentStatus } from "@/lib/types";
import { requiredUuid } from "@/lib/validation";

export async function updateAppointmentStatusWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const status = parseAppointmentStatus(String(formData.get("status") ?? ""));
  const labels: Record<AppointmentStatus, string> = {
    pending: "Cita marcada como pendiente.",
    confirmed: "Cita marcada como confirmada manualmente; no se envio un mensaje.",
    cancelled: "Cita cancelada.",
  };
  return withActionFeedback(() => updateAppointmentStatus(formData, status), labels[status]);
}

export async function confirmAppointmentAndNotifyWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withActionFeedback(
    () => confirmAppointmentAndNotify(requiredUuid(formData, "id", "Cita")),
    "Cita confirmada y cliente notificado por WhatsApp.",
  );
}

async function updateAppointmentStatus(formData: FormData, status: AppointmentStatus) {
  const { supabase } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("appointment_requests")
    .update({ status })
    .eq("id", requiredUuid(formData, "id", "Cita"))
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/appointments");
  revalidatePath("/conversations");
}

async function confirmAppointmentAndNotify(id: string) {
  const { supabase } = await getAuthenticatedClient();
  const { data: appointment, error } = await supabase
    .from("appointment_requests")
    .select("id,business_id,customer_id,conversation_id,service,preferred_date,preferred_time")
    .eq("id", id)
    .single();
  if (error || !appointment) throw error ?? new Error("Solicitud de cita no encontrada.");
  const delivery = await getWhatsAppDeliveryContext(
    supabase,
    appointment.business_id,
    appointment.customer_id,
    appointment.conversation_id,
  );
  await setDeliveryPending(supabase, "appointment_requests", appointment.id);

  let providerMessageId: string;
  try {
    const result = await notifyCustomer({
      type: "appointment",
      customerName: delivery.customer.name,
      customerPhone: delivery.customer.phone,
      businessName: delivery.business.name,
      sourcePhoneNumberId: delivery.business.whatsapp_phone_number_id ?? undefined,
      service: appointment.service,
      date: appointment.preferred_date,
      time: appointment.preferred_time,
    });
    providerMessageId = result.providerMessageId;
  } catch (sendError) {
    await setDeliveryFailed(supabase, "appointment_requests", appointment.id, sendError);
    throw new Error("No se pudo notificar al cliente. La cita no se marco como confirmada.");
  }

  const { error: updateError } = await supabase
    .from("appointment_requests")
    .update({
      status: "confirmed",
      delivery_status: "sent",
      sent_at: new Date().toISOString(),
      error_message: null,
      provider_message_id: providerMessageId,
    })
    .eq("id", appointment.id)
    .select("id")
    .single();
  if (updateError) throw new Error("El mensaje fue enviado, pero no se pudo guardar la confirmacion.");
  revalidateCommercialPaths();
}

function parseAppointmentStatus(value: string): AppointmentStatus {
  return value === "confirmed" || value === "cancelled" ? value : "pending";
}
