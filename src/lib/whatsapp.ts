export async function sendWhatsAppText(to: string, body: string, sourcePhoneNumberId?: string) {
  return sendWhatsAppPayload(
    to,
    {
      messaging_product: "whatsapp",
      type: "text",
      text: {
        preview_url: false,
        body: body.slice(0, 3900),
      },
    },
    sourcePhoneNumberId,
  );
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  parameters: string[],
  sourcePhoneNumberId?: string,
) {
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "es_CO";

  return sendWhatsAppPayload(
    to,
    {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: "body",
            parameters: parameters.map((parameter) => ({
              type: "text",
              text: parameter.slice(0, 1024),
            })),
          },
        ],
      },
    },
    sourcePhoneNumberId,
  );
}

async function sendWhatsAppPayload(
  to: string,
  payload: Record<string, unknown>,
  sourcePhoneNumberId?: string,
) {
  const phoneNumberId = sourcePhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const normalizedTo = normalizeWhatsAppPhone(to);

  if (!phoneNumberId || !accessToken) {
    throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN.");
  }

  if (!normalizedTo) {
    throw new Error("Invalid WhatsApp recipient phone.");
  }

  const response = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: normalizedTo,
      ...payload,
    }),
  });

  if (!response.ok) {
    const error = (await response.text()).slice(0, 1200);
    throw new Error(`WhatsApp send failed (${response.status}): ${error}`);
  }

  const data = (await response.json()) as { messages?: Array<{ id?: string }> };
  const providerMessageId = data.messages?.[0]?.id?.trim();
  if (!providerMessageId) throw new Error("WhatsApp accepted the request without returning a message ID.");

  return { providerMessageId };
}

export function normalizeWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) return "";
  if (digits.length === 10 && digits.startsWith("3")) return `57${digits}`;
  if (digits.length === 12 && digits.startsWith("57")) return digits;
  if (digits.length >= 8 && digits.length <= 15) return digits;

  return "";
}
