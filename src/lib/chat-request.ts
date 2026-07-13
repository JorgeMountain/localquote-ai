import type { ChatRequest } from "./types";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedChatRequest =
  | { ok: true; payload: ChatRequest & { slug: string; message: string } }
  | { ok: false; error: string };

export function parseChatRequestBody(rawBody: string, maxMessageLength: number): ParsedChatRequest {
  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: "JSON invalido." };
  }

  if (!value || typeof value !== "object") return { ok: false, error: "JSON invalido." };
  const source = value as Record<string, unknown>;
  const slug = normalizeRequiredString(source.slug);
  const message = normalizeRequiredString(source.message);
  if (!slug || !message) return { ok: false, error: "slug and message are required" };
  if (slug.length > 64 || !slugPattern.test(slug)) return { ok: false, error: "Slug invalido." };
  if (message.length > maxMessageLength) return { ok: false, error: "El mensaje no puede superar 2000 caracteres." };

  const customerName = normalizeOptionalString(source.customerName, 120);
  const customerPhone = normalizeOptionalString(source.customerPhone, 32);
  const customerId = normalizeOptionalString(source.customerId, 36);
  const conversationId = normalizeOptionalString(source.conversationId, 36);
  if (customerName === false || customerPhone === false || customerId === false || conversationId === false) {
    return { ok: false, error: "Solicitud de chat invalida." };
  }
  if ((customerId && !uuidPattern.test(customerId)) || (conversationId && !uuidPattern.test(conversationId))) {
    return { ok: false, error: "Sesion de chat invalida." };
  }

  return {
    ok: true,
    payload: {
      slug,
      message,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      customerId: customerId || undefined,
      conversationId: conversationId || undefined,
    },
  };
}

function normalizeRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown, maxLength: number): string | false {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized : false;
}
