import { NextResponse } from "next/server";
import { generateAssistantReply } from "@/lib/ai";
import { WebChatProvider } from "@/lib/messaging";
import {
  addMessage,
  createAppointment,
  createQuote,
  getBusinessBySlug,
  getBusinessFaqs,
  getConversationMessages,
  setConversationIntent,
  startOrContinueConversation,
  upsertCustomer,
} from "@/lib/store";
import type { ChatRequest } from "@/lib/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as ChatRequest;
  const provider = new WebChatProvider();
  const input = await provider.receive(payload);

  if (!input.slug || !input.customerName || !input.customerPhone || !input.message) {
    return NextResponse.json(
      { error: "slug, customerName, customerPhone and message are required" },
      { status: 400 },
    );
  }

  const business = getBusinessBySlug(input.slug);
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const customer = upsertCustomer({
    businessId: business.id,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
  });

  const conversation = startOrContinueConversation({
    businessId: business.id,
    customerId: customer.id,
    conversationId: input.conversationId,
  });

  addMessage({
    conversationId: conversation.id,
    role: "customer",
    body: input.message,
  });

  const history = getConversationMessages(conversation.id);
  const ai = await generateAssistantReply({
    business,
    faqs: getBusinessFaqs(business.id),
    history,
    userMessage: input.message,
  });

  setConversationIntent(conversation.id, ai.intent);
  addMessage({
    conversationId: conversation.id,
    role: "assistant",
    body: ai.reply,
  });

  const quote =
    ai.intent === "quote"
      ? createQuote({
          businessId: business.id,
          customerId: customer.id,
          service: business.type === "dentist" ? "Consulta o valoracion" : "Diagnostico tecnico",
          description: input.message,
          minPrice: business.type === "dentist" ? 120000 : 80000,
          maxPrice: business.type === "dentist" ? 250000 : 220000,
          notes: "Cotizacion estimada generada por IA. Requiere confirmacion del negocio.",
        })
      : undefined;

  const appointment =
    ai.intent === "appointment"
      ? createAppointment({
          businessId: business.id,
          customerId: customer.id,
          service: business.services[0],
          preferredDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          preferredTime: "Por confirmar",
        })
      : undefined;

  const response = await provider.send({
    conversationId: conversation.id,
    reply: ai.reply,
    intent: ai.intent,
    quote,
    appointment,
  });

  return NextResponse.json(response);
}
