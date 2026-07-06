import { NextResponse } from "next/server";
import { generateAssistantReply } from "@/lib/ai";
import { analyzeCommercialRequest, buildCommercialReply } from "@/lib/commercial";
import { getPublicBusiness, getPublicFaqs } from "@/lib/db";
import { createAnonRouteClient } from "@/lib/supabase/route";
import type { Message } from "@/lib/types";

type WhatsAppTextMessage = {
  from: string;
  id: string;
  timestamp: string;
  text?: {
    body?: string;
  };
  type: string;
};

type WhatsAppContact = {
  profile?: {
    name?: string;
  };
  wa_id: string;
};

type WhatsAppWebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        contacts?: WhatsAppContact[];
        messages?: WhatsAppTextMessage[];
      };
    }[];
  }[];
};

const sessions = new Map<string, { conversationId: string; customerId: string; history: Pick<Message, "role" | "body">[] }>();

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
  const payload = (await request.json()) as WhatsAppWebhookPayload;
  const incoming = getIncomingMessage(payload);

  if (!incoming) {
    return NextResponse.json({ ok: true });
  }

  const { contact, message } = incoming;
  const text = message.text?.body?.trim();

  if (!text || message.type !== "text") {
    await sendWhatsAppMessage(message.from, "Por ahora solo puedo responder mensajes de texto.");
    return NextResponse.json({ ok: true });
  }

  const supabase = createAnonRouteClient();
  const business = await getPublicBusiness(supabase, process.env.WHATSAPP_DEFAULT_BUSINESS_SLUG ?? "sonrisa-clara");

  if (!business) {
    await sendWhatsAppMessage(message.from, "No pude encontrar el negocio configurado para este WhatsApp.");
    return NextResponse.json({ ok: false, error: "Business not found" }, { status: 500 });
  }

  const businessFaqs = await getPublicFaqs(supabase, business.id);
  const session = sessions.get(message.from);
  const customerId = session?.customerId ?? crypto.randomUUID();
  const conversationId = session?.conversationId ?? crypto.randomUUID();
  const customerName = contact.profile?.name ?? `WhatsApp ${message.from}`;
  const history = (session?.history ?? []).slice(-8).map((item) => ({
    id: crypto.randomUUID(),
    conversationId,
    role: item.role,
    body: item.body,
    createdAt: new Date().toISOString(),
  }));
  const commercialContext = [...history.filter((item) => item.role === "customer").map((item) => item.body), text]
    .slice(-6)
    .join("\n");
  const analysis = analyzeCommercialRequest(commercialContext, business);
  const shouldUseFaqAnswer = analysis.intent === "faq" && hasRelevantFaq(text, businessFaqs);
  const hasExistingAppointment = history.some(
    (item) =>
      item.role === "assistant" &&
      item.body.toLowerCase().includes("solicitud de cita") &&
      /registrad[ao]/i.test(item.body),
  );
  const hasExistingQuote = history.some(
    (item) => item.role === "assistant" && item.body.toLowerCase().includes("cotizacion estimada"),
  );

  if (!session) {
    const { error: customerError } = await supabase.from("customers").insert({
      id: customerId,
      business_id: business.id,
      name: customerName,
      phone: contact.wa_id || message.from,
      status: analysis.appointmentDraft ? "appointment" : analysis.quoteDraft ? "quoted" : "new",
    });

    if (customerError) throw customerError;

    const { error: conversationError } = await supabase.from("conversations").insert({
      id: conversationId,
      business_id: business.id,
      customer_id: customerId,
      channel: "whatsapp",
      last_intent: shouldUseFaqAnswer ? "faq" : analysis.intent,
    });

    if (conversationError) throw conversationError;
  }

  const ai = await generateAssistantReply({
    business,
    faqs: businessFaqs,
    history,
    customerName,
    customerPhone: contact.wa_id || message.from,
    userMessage: text,
  });
  const shouldAppendCommercialReply =
    !(hasExistingAppointment && analysis.appointmentDraft) && !(hasExistingQuote && analysis.quoteDraft);
  const reply = shouldUseFaqAnswer
    ? ai.reply
    : shouldAppendCommercialReply
      ? buildCommercialReply(ai.reply, analysis)
      : ai.reply;

  const { error: messagesError } = await supabase.from("messages").insert([
    {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "customer",
      body: text,
    },
    {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "assistant",
      body: reply,
    },
  ]);

  if (messagesError) throw messagesError;

  if (analysis.quoteDraft && !hasExistingQuote) {
    const { error } = await supabase.from("quotes").insert({
      id: crypto.randomUUID(),
      business_id: business.id,
      customer_id: customerId,
      service: analysis.quoteDraft.service,
      description: analysis.quoteDraft.description,
      min_price: analysis.quoteDraft.minPrice,
      max_price: analysis.quoteDraft.maxPrice,
      notes: analysis.quoteDraft.notes,
      status: "draft",
    });

    if (error) throw error;
  }

  if (analysis.appointmentDraft && !hasExistingAppointment) {
    const { error } = await supabase.from("appointment_requests").insert({
      id: crypto.randomUUID(),
      business_id: business.id,
      customer_id: customerId,
      service: analysis.appointmentDraft.service,
      preferred_date: analysis.appointmentDraft.preferredDate,
      preferred_time: analysis.appointmentDraft.preferredTime,
      status: "pending",
    });

    if (error) throw error;
  }

  await sendWhatsAppMessage(message.from, reply);
  const fullHistory: Pick<Message, "role" | "body">[] = [
    ...(session?.history ?? []),
    { role: "customer", body: text },
    { role: "assistant", body: reply },
  ];
  const nextHistory = fullHistory.slice(-8);
  sessions.set(message.from, {
    conversationId,
    customerId,
    history: nextHistory,
  });

  return NextResponse.json({ ok: true });
}

function getIncomingMessage(payload: WhatsAppWebhookPayload) {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const message = change.value?.messages?.[0];
      const contact = change.value?.contacts?.[0];
      if (message && contact) return { contact, message };
    }
  }

  return null;
}

async function sendWhatsAppMessage(to: string, body: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN.");
  }

  const response = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
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

function hasRelevantFaq(message: string, faqs: Awaited<ReturnType<typeof getPublicFaqs>>) {
  const tokens = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\W+/)
    .filter((token) => token.length > 3);

  return faqs.some((faq) => {
    const searchable = `${faq.question} ${faq.answer}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return tokens.some((token) => searchable.includes(token));
  });
}
