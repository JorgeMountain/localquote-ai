import { currencyCop } from "@/lib/format";
import { sendWhatsAppTemplate, sendWhatsAppText } from "@/lib/whatsapp";

type CustomerNotificationInput =
  | {
      type: "appointment";
      customerName: string;
      customerPhone: string;
      businessName: string;
      sourcePhoneNumberId?: string;
      service: string;
      date: string;
      time: string;
    }
  | {
      type: "quote";
      customerName: string;
      customerPhone: string;
      businessName: string;
      sourcePhoneNumberId?: string;
      service: string;
      description: string;
      minPrice: number;
      maxPrice: number;
      notes: string;
    };

export async function notifyCustomer(input: CustomerNotificationInput) {
  const message = buildCustomerNotification(input);

  try {
    return await sendWhatsAppText(input.customerPhone, message, input.sourcePhoneNumberId);
  } catch (textError) {
    const templateName = getTemplateName(input.type);
    if (!templateName) throw textError;

    try {
      return await sendWhatsAppTemplate(
        input.customerPhone,
        templateName,
        getTemplateParameters(input),
        input.sourcePhoneNumberId,
      );
    } catch (templateError) {
      throw new Error(
        `No se pudo enviar el mensaje libre ni la plantilla aprobada. ${getErrorMessage(templateError)}`,
      );
    }
  }
}

export function buildCustomerNotification(input: CustomerNotificationInput) {
  const greeting = input.customerName ? `Hola, ${input.customerName}.` : "Hola.";

  if (input.type === "appointment") {
    return [
      greeting,
      `${input.businessName} confirmó tu cita.`,
      `Servicio: ${input.service}`,
      `Fecha: ${input.date}`,
      `Hora: ${input.time}`,
      "Si necesitas cambiarla, responde a este mensaje.",
    ].join("\n");
  }

  return [
    greeting,
    `${input.businessName} te envía esta cotización.`,
    `Servicio: ${input.service}`,
    `Rango estimado: ${currencyCop(input.minPrice)} - ${currencyCop(input.maxPrice)}`,
    input.description,
    input.notes,
    "Responde a este mensaje si deseas continuar.",
  ]
    .filter(Boolean)
    .join("\n");
}

function getTemplateName(type: CustomerNotificationInput["type"]) {
  const value =
    type === "appointment"
      ? process.env.WHATSAPP_APPOINTMENT_TEMPLATE_NAME
      : process.env.WHATSAPP_QUOTE_TEMPLATE_NAME;
  return value?.trim() || "";
}

function getTemplateParameters(input: CustomerNotificationInput) {
  const customerName = input.customerName || "cliente";
  if (input.type === "appointment") {
    return [customerName, input.businessName, input.service, input.date, input.time];
  }

  return [
    customerName,
    input.businessName,
    input.service,
    `${currencyCop(input.minPrice)} - ${currencyCop(input.maxPrice)}`,
    input.description,
  ];
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido de WhatsApp.";
}
