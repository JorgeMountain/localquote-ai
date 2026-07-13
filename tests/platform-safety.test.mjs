import assert from "node:assert/strict";
import test from "node:test";
import { buildPasswordResetRedirect, normalizePasswordResetEmail } from "../src/lib/auth-reset.ts";
import { resolveRequestedBusinessId, scopedBusinessIds } from "../src/lib/db.ts";
import { isActiveAppRoute } from "../src/lib/navigation.ts";
import { getPaymentReceiptExtension, maxReceiptFileSize, validatePaymentReceiptFile } from "../src/lib/payment-receipt.ts";

const businesses = [{ id: "business-a" }, { id: "business-b" }];

test("mantiene el alcance multi-negocio cuando llega un filtro no autorizado", () => {
  assert.equal(resolveRequestedBusinessId(businesses, "business-b"), "business-b");
  assert.equal(resolveRequestedBusinessId(businesses, "business-externo"), undefined);
  assert.deepEqual(scopedBusinessIds(businesses, "business-externo"), ["business-a", "business-b"]);
  assert.deepEqual(scopedBusinessIds(businesses, "business-b"), ["business-b"]);
});

test("marca correctamente la ruta activa en navegacion movil", () => {
  assert.equal(isActiveAppRoute("/", "/"), true);
  assert.equal(isActiveAppRoute("/conversations", "/conversations"), true);
  assert.equal(isActiveAppRoute("/conversations?id=1", "/conversations"), false);
  assert.equal(isActiveAppRoute("/appointments", "/conversations"), false);
});

test("normaliza el restablecimiento de contrasena con retorno seguro", () => {
  assert.equal(normalizePasswordResetEmail("  Jorge@Example.com "), "jorge@example.com");
  assert.equal(normalizePasswordResetEmail("correo-invalido"), null);
  assert.equal(
    buildPasswordResetRedirect("https://tactio.example"),
    "https://tactio.example/auth/callback?next=/update-password",
  );
});

test("valida foto o PDF de comprobante antes de subirlo", () => {
  assert.equal(validatePaymentReceiptFile({ type: "image/png", size: 1200 }), null);
  assert.match(validatePaymentReceiptFile({ type: "text/plain", size: 1200 }) ?? "", /Formato no permitido/);
  assert.match(validatePaymentReceiptFile({ type: "application/pdf", size: maxReceiptFileSize + 1 }) ?? "", /5 MB/);
  assert.equal(getPaymentReceiptExtension("factura.PDF"), "pdf");
  assert.equal(getPaymentReceiptExtension("sin-extension"), "sinextension");
});
