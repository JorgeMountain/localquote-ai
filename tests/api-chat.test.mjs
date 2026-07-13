import assert from "node:assert/strict";
import test from "node:test";
import { parseChatRequestBody } from "../src/lib/chat-request.ts";

test("valida una solicitud del API de chat", () => {
  const result = parseChatRequestBody(
    JSON.stringify({
      slug: "clinica-sonrisa",
      message: "Quiero una limpieza dental",
      customerName: "Jorge",
      customerPhone: "3017505267",
    }),
    2000,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.payload.slug, "clinica-sonrisa");
    assert.equal(result.payload.customerName, "Jorge");
  }
});

test("rechaza JSON, campos tipados incorrectamente y sesiones ajenas", () => {
  assert.equal(parseChatRequestBody("{", 2000).ok, false);
  assert.equal(
    parseChatRequestBody(JSON.stringify({ slug: "clinica", message: "Hola", customerName: 12 }), 2000).ok,
    false,
  );
  assert.equal(
    parseChatRequestBody(
      JSON.stringify({ slug: "clinica", message: "Hola", conversationId: "no-es-un-uuid" }),
      2000,
    ).ok,
    false,
  );
});

test("rechaza mensajes que exceden el limite del API", () => {
  const result = parseChatRequestBody(
    JSON.stringify({ slug: "clinica", message: "a".repeat(2001) }),
    2000,
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /2000 caracteres/);
});
