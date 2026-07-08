export async function sendWhatsAppText(to: string, body: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
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
      messaging_product: "whatsapp",
      to: normalizedTo,
      type: "text",
      text: {
        preview_url: false,
        body: body.slice(0, 3900),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp send failed: ${error}`);
  }
}

export function normalizeWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) return "";
  if (digits.length === 10 && digits.startsWith("3")) return `57${digits}`;
  if (digits.length === 12 && digits.startsWith("57")) return digits;
  if (digits.length >= 8 && digits.length <= 15) return digits;

  return "";
}
