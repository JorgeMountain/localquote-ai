import assert from "node:assert/strict";
import test from "node:test";
import { getWebhookQueueAcknowledgement, normalizeInboundWhatsAppMessage } from "../src/lib/whatsapp-webhook.ts";

test("normaliza un mensaje de WhatsApp antes de encolarlo", () => {
  assert.deepEqual(normalizeInboundWhatsAppMessage("text", "  Hola, necesito una cita  "), {
    incomingMessage: "Hola, necesito una cita",
    messageType: "text",
  });
});

test("no guarda contenido de mensajes no soportados o demasiado largos", () => {
  assert.deepEqual(normalizeInboundWhatsAppMessage("image", "contenido"), {
    incomingMessage: "",
    messageType: "unsupported",
  });
  assert.deepEqual(normalizeInboundWhatsAppMessage("text", "a".repeat(2001)), {
    incomingMessage: "",
    messageType: "unsupported",
  });
});

test("reconoce un evento duplicado sin volver a encolarlo", () => {
  assert.deepEqual(getWebhookQueueAcknowledgement(false), { ok: true, duplicate: true });
  assert.deepEqual(getWebhookQueueAcknowledgement(true), { ok: true, queued: true });
});
