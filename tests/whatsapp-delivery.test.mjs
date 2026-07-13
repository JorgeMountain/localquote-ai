import assert from "node:assert/strict";
import test from "node:test";
import { sendWhatsAppText } from "../src/lib/whatsapp.ts";

test("WhatsApp returns the provider message id after a successful delivery", async (context) => {
  const originalFetch = global.fetch;
  const originalToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  context.after(() => {
    global.fetch = originalFetch;
    restoreEnvironment("WHATSAPP_ACCESS_TOKEN", originalToken);
    restoreEnvironment("WHATSAPP_PHONE_NUMBER_ID", originalPhoneNumberId);
  });

  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789";
  global.fetch = async (url, init) => {
    assert.equal(url, "https://graph.facebook.com/v25.0/123456789/messages");
    assert.equal(init.headers.Authorization, "Bearer test-token");
    const payload = JSON.parse(init.body);
    assert.equal(payload.to, "573017505267");
    assert.equal(payload.type, "text");
    return Response.json({ messages: [{ id: "wamid.test-message" }] });
  };

  const result = await sendWhatsAppText("301 750 5267", "Tu cita fue confirmada.");
  assert.equal(result.providerMessageId, "wamid.test-message");
});

test("WhatsApp delivery failure rejects and does not invent a provider id", async (context) => {
  const originalFetch = global.fetch;
  const originalToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  context.after(() => {
    global.fetch = originalFetch;
    restoreEnvironment("WHATSAPP_ACCESS_TOKEN", originalToken);
    restoreEnvironment("WHATSAPP_PHONE_NUMBER_ID", originalPhoneNumberId);
  });

  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789";
  global.fetch = async () =>
    Response.json({ error: { message: "Outside customer service window" } }, { status: 400 });

  await assert.rejects(
    () => sendWhatsAppText("573017505267", "Tu cotizacion esta lista."),
    /WhatsApp send failed \(400\)/,
  );
});

function restoreEnvironment(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
