import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyMetaWebhookSignature } from "../src/lib/webhook-security.ts";

test("acepta una firma valida de Meta", () => {
  const previousSecret = process.env.WHATSAPP_APP_SECRET;
  const previousEnvironment = process.env.NODE_ENV;
  process.env.WHATSAPP_APP_SECRET = "test-app-secret";
  process.env.NODE_ENV = "production";

  try {
    const body = JSON.stringify({ object: "whatsapp_business_account" });
    const signature = `sha256=${createHmac("sha256", "test-app-secret").update(body).digest("hex")}`;
    assert.equal(verifyMetaWebhookSignature(body, signature), true);
  } finally {
    restoreEnvironment("WHATSAPP_APP_SECRET", previousSecret);
    restoreEnvironment("NODE_ENV", previousEnvironment);
  }
});

test("rechaza firmas manipuladas", () => {
  const previousSecret = process.env.WHATSAPP_APP_SECRET;
  process.env.WHATSAPP_APP_SECRET = "test-app-secret";

  try {
    assert.equal(verifyMetaWebhookSignature("body", `sha256=${"0".repeat(64)}`), false);
    assert.equal(verifyMetaWebhookSignature("body", null), false);
  } finally {
    restoreEnvironment("WHATSAPP_APP_SECRET", previousSecret);
  }
});

function restoreEnvironment(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
