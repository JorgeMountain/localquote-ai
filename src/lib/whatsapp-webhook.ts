export function normalizeInboundWhatsAppMessage(type: string, body?: string) {
  const text = body?.trim() ?? "";
  if (type === "text" && text.length > 0 && text.length <= 2000) {
    return { incomingMessage: text, messageType: "text" };
  }

  return { incomingMessage: "", messageType: "unsupported" };
}

export function getWebhookQueueAcknowledgement(queued: boolean) {
  return queued ? { ok: true, queued: true } : { ok: true, duplicate: true };
}
