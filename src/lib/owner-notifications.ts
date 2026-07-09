import { currencyCop } from "@/lib/format";
import type { AppointmentRequest, Business, Quote } from "@/lib/types";
import { sendWhatsAppText } from "@/lib/whatsapp";

type OwnerNotificationInput =
  | {
      type: "appointment";
      business: Business;
      customerName: string;
      customerPhone: string;
      appointment: AppointmentRequest;
    }
  | {
      type: "quote";
      business: Business;
      customerName: string;
      customerPhone: string;
      quote: Quote;
    };

export async function notifyBusinessOwner(input: OwnerNotificationInput) {
  const recipient = process.env.BUSINESS_OWNER_NOTIFY_PHONE || input.business.phone;

  if (!recipient) return;

  try {
    await sendWhatsAppText(recipient, buildOwnerMessage(input), input.business.whatsappPhoneNumberId);
  } catch (error) {
    console.warn("Owner WhatsApp notification failed", error);
  }
}

function buildOwnerMessage(input: OwnerNotificationInput) {
  const header = `Tactio: nueva ${input.type === "appointment" ? "solicitud de cita" : "cotizacion"} para ${input.business.name}`;
  const customer = `Cliente: ${input.customerName}\nTelefono: ${input.customerPhone}`;

  if (input.type === "appointment") {
    return [
      header,
      customer,
      `Servicio: ${input.appointment.service}`,
      `Fecha: ${input.appointment.preferredDate}`,
      `Hora: ${input.appointment.preferredTime}`,
      "Estado: pendiente de confirmacion",
      "Revisa el panel de Citas para confirmar o cancelar.",
    ].join("\n");
  }

  return [
    header,
    customer,
    `Servicio: ${input.quote.service}`,
    `Rango: ${currencyCop(input.quote.minPrice)} - ${currencyCop(input.quote.maxPrice)}`,
    `Descripcion: ${input.quote.description}`,
    "Estado: borrador pendiente de revision",
    "Revisa el panel de Cotizaciones antes de enviarla.",
  ].join("\n");
}
