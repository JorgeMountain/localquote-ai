import { NextResponse } from "next/server";
import { generateAssistantReply } from "@/lib/ai";
import { getPublicBusiness, getPublicFaqs } from "@/lib/db";
import { WebChatProvider } from "@/lib/messaging";
import { createAnonRouteClient } from "@/lib/supabase/route";
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

  const supabase = createAnonRouteClient();
  const business = await getPublicBusiness(supabase, input.slug);

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const businessFaqs = await getPublicFaqs(supabase, business.id);
  const customerId = input.customerId ?? crypto.randomUUID();
  const conversationId = input.conversationId ?? crypto.randomUUID();

  if (!input.customerId) {
    const { error } = await supabase.from("customers").insert({
      id: customerId,
      business_id: business.id,
      name: input.customerName,
      phone: input.customerPhone,
      status: "new",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const ai = await generateAssistantReply({
    business,
    faqs: businessFaqs,
    history: [],
    userMessage: input.message,
  });

  if (!input.conversationId) {
    const { error } = await supabase.from("conversations").insert({
      id: conversationId,
      business_id: business.id,
      customer_id: customerId,
      channel: "web",
      last_intent: ai.intent,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { error: messagesError } = await supabase.from("messages").insert([
    {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "customer",
      body: input.message,
    },
    {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "assistant",
      body: ai.reply,
    },
  ]);

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const quote =
    ai.intent === "quote"
      ? {
          id: crypto.randomUUID(),
          businessId: business.id,
          customerId,
          service: business.type === "dentist" ? "Consulta o valoracion" : "Diagnostico tecnico",
          description: input.message,
          minPrice: business.type === "dentist" ? 120000 : 80000,
          maxPrice: business.type === "dentist" ? 250000 : 220000,
          notes: "Cotizacion estimada generada por IA. Requiere confirmacion del negocio.",
          status: "draft" as const,
        }
      : undefined;

  if (quote) {
    const { error } = await supabase.from("quotes").insert({
      id: quote.id,
      business_id: quote.businessId,
      customer_id: quote.customerId,
      service: quote.service,
      description: quote.description,
      min_price: quote.minPrice,
      max_price: quote.maxPrice,
      notes: quote.notes,
      status: quote.status,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const appointment =
    ai.intent === "appointment"
      ? {
          id: crypto.randomUUID(),
          businessId: business.id,
          customerId,
          service: business.services[0],
          preferredDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          preferredTime: "Por confirmar",
          status: "pending" as const,
        }
      : undefined;

  if (appointment) {
    const { error } = await supabase.from("appointment_requests").insert({
      id: appointment.id,
      business_id: appointment.businessId,
      customer_id: appointment.customerId,
      service: appointment.service,
      preferred_date: appointment.preferredDate,
      preferred_time: appointment.preferredTime,
      status: appointment.status,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const response = await provider.send({
    conversationId,
    customerId,
    reply: ai.reply,
    intent: ai.intent,
    quote,
    appointment,
  });

  return NextResponse.json(response);
}
