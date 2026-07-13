import { NextResponse } from "next/server";
import { processChatMessage } from "@/lib/chat-service";
import {
  claimWhatsAppEvent,
  consumeInternalRateLimit,
  finishWhatsAppEvent,
  getInternalChatContext,
} from "@/lib/chat-store";
import { createAnonRouteClient } from "@/lib/supabase/route";
import { hasWhatsAppWebhookSecret, verifyMetaWebhookSignature } from "@/lib/webhook-security";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { isPhone } from "@/lib/validation";

export const runtime = "nodejs";

type WhatsAppTextMessage = {
  from: string;
  id: string;
  timestamp: string;
  text?: { body?: string };
  type: string;
};

type WhatsAppContact = {
  profile?: { name?: string };
  wa_id: string;
};

type WhatsAppWebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        contacts?: WhatsAppContact[];
        messages?: WhatsAppTextMessage[];
        metadata?: {
          phone_number_id?: string;
        };
      };
    }[];
  }[];
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Invalid verification token" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 256 * 1024) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  if (process.env.NODE_ENV === "production" && !hasWhatsAppWebhookSecret()) {
    return NextResponse.json({ error: "WHATSAPP_APP_SECRET is required" }, { status: 503 });
  }
  if (!verifyMetaWebhookSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = getIncomingMessage(payload);
  if (!incoming) return NextResponse.json({ ok: true });

  const { contact, message, phoneNumberId } = incoming;
  if (
    !isPhone(message.from)
    || message.id.length > 512
    || !phoneNumberId
    || !/^\d{5,32}$/.test(phoneNumberId)
  ) {
    return NextResponse.json({ error: "Invalid WhatsApp message metadata" }, { status: 400 });
  }
  const supabase = createAnonRouteClient();
  let claimed = false;

  try {
    const context = await getInternalChatContext(supabase, {
      phoneNumberId,
      slug: process.env.WHATSAPP_DEFAULT_BUSINESS_SLUG,
    });

    if (!context) {
      console.error("WhatsApp webhook business not found.", { phoneNumberId });
      return NextResponse.json({ ok: false, error: "Business not found" }, { status: 500 });
    }

    const allowed = await consumeInternalRateLimit(
      supabase,
      `whatsapp:${context.business.id}:${message.from.slice(0, 32)}`,
      30,
      60,
    );
    if (!allowed) return NextResponse.json({ ok: true, rateLimited: true });

    claimed = await claimWhatsAppEvent(supabase, message.id, context.business.id);
    if (!claimed) return NextResponse.json({ ok: true, duplicate: true });

    const text = message.text?.body?.trim();
    if (!text || message.type !== "text") {
      await sendWhatsAppText(
        message.from,
        "Por ahora solo puedo responder mensajes de texto.",
        context.business.whatsappPhoneNumberId ?? phoneNumberId,
      );
      await finishWhatsAppEvent(supabase, message.id, true);
      return NextResponse.json({ ok: true });
    }
    if (text.length > 2000) {
      await sendWhatsAppText(
        message.from,
        "El mensaje es demasiado largo. Envíalo nuevamente en menos de 2000 caracteres.",
        context.business.whatsappPhoneNumberId ?? phoneNumberId,
      );
      await finishWhatsAppEvent(supabase, message.id, true);
      return NextResponse.json({ ok: true });
    }

    const response = await processChatMessage({
      channel: "whatsapp",
      phoneNumberId,
      slug: process.env.WHATSAPP_DEFAULT_BUSINESS_SLUG,
      customerName: contact?.profile?.name,
      customerPhone: contact?.wa_id || message.from,
      message: text,
    });

    if (!response) throw new Error("Business not found");

    await sendWhatsAppText(
      message.from,
      response.reply,
      response.responsePhoneNumberId ?? phoneNumberId,
    );
    await finishWhatsAppEvent(supabase, message.id, true);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (claimed) {
      try {
        await finishWhatsAppEvent(supabase, message.id, false);
      } catch (finishError) {
        console.error("Failed to mark WhatsApp event as failed.", finishError);
      }
    }
    console.error("WhatsApp webhook processing failed.", error);
    const errorMessage = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

function getIncomingMessage(payload: WhatsAppWebhookPayload | null) {
  for (const entry of payload?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const message = change.value?.messages?.[0];
      const contact = change.value?.contacts?.[0];
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (message) return { contact, message, phoneNumberId };
    }
  }

  return null;
}
