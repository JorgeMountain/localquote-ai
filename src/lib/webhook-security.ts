import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const receivedHex = signatureHeader.slice("sha256=".length);
  if (!/^[a-f0-9]{64}$/i.test(receivedHex)) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const received = Buffer.from(receivedHex, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function hasWhatsAppWebhookSecret() {
  return Boolean(process.env.WHATSAPP_APP_SECRET);
}
