import { NextResponse } from "next/server";
import { generateAssistantReply } from "@/lib/ai";
import { analyzeCommercialRequest, buildCommercialReply } from "@/lib/commercial";
import { getPublicBusiness, getPublicFaqs, getPublicSchedule } from "@/lib/db";
import { WebChatProvider } from "@/lib/messaging";
import { notifyBusinessOwner } from "@/lib/owner-notifications";
import { buildAvailabilityReply, validateAppointmentAvailability } from "@/lib/schedule";
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

  const [businessFaqs, schedule] = await Promise.all([
    getPublicFaqs(supabase, business.id),
    getPublicSchedule(supabase, business.id),
  ]);
  const customerId = input.customerId ?? crypto.randomUUID();
  const conversationId = input.conversationId ?? crypto.randomUUID();
  const history = (input.history ?? []).slice(-8).map((message) => ({
    id: crypto.randomUUID(),
    conversationId,
    role: message.role,
    body: message.body,
    createdAt: new Date().toISOString(),
  }));
  const commercialContext = [...history.filter((message) => message.role === "customer").map((message) => message.body), input.message]
    .slice(-6)
    .join("\n");
  const analysis = analyzeCommercialRequest(commercialContext, business);
  const shouldUseFaqAnswer = analysis.intent === "faq" && hasRelevantFaq(input.message, businessFaqs);
  const effectiveIntent = shouldUseFaqAnswer ? "faq" : analysis.intent;
  const hasExistingAppointment = history.some(
    (message) =>
      message.role === "assistant" &&
      message.body.toLowerCase().includes("solicitud de cita") &&
      /registrad[ao]/i.test(message.body),
  );
  const hasExistingQuote = history.some(
    (message) => message.role === "assistant" && message.body.toLowerCase().includes("cotizacion estimada"),
  );
  const appointmentAvailability =
    analysis.appointmentDraft && !hasExistingAppointment
      ? validateAppointmentAvailability({
          appointment: {
            businessId: business.id,
            preferredDate: analysis.appointmentDraft.preferredDate,
            preferredTime: analysis.appointmentDraft.preferredTime,
          },
          ...schedule,
        })
      : undefined;

  if (!input.customerId) {
    const { error } = await supabase.from("customers").insert({
      id: customerId,
      business_id: business.id,
      name: input.customerName,
      phone: input.customerPhone,
      status: analysis.appointmentDraft ? "appointment" : analysis.quoteDraft ? "quoted" : "new",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

  }

  const ai = await generateAssistantReply({
    business,
    faqs: businessFaqs,
    history,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    userMessage: input.message,
  });
  const shouldAppendCommercialReply =
    !(hasExistingAppointment && analysis.appointmentDraft) && !(hasExistingQuote && analysis.quoteDraft);
  const reply = shouldUseFaqAnswer
    ? ai.reply
    : appointmentAvailability && !appointmentAvailability.canCreateRequest
      ? `${ai.reply} ${buildAvailabilityReply(appointmentAvailability)}`
    : shouldAppendCommercialReply
      ? buildCommercialReply(ai.reply, analysis)
      + (appointmentAvailability?.message ? ` ${appointmentAvailability.message}` : "")
      : ai.reply;

  if (!input.conversationId) {
    const { error } = await supabase.from("conversations").insert({
      id: conversationId,
      business_id: business.id,
      customer_id: customerId,
      channel: "web",
      last_intent: effectiveIntent,
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
      body: reply,
    },
  ]);

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const quote =
    analysis.quoteDraft && !hasExistingQuote
      ? {
          id: crypto.randomUUID(),
          businessId: business.id,
          customerId,
          ...analysis.quoteDraft,
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

    await notifyBusinessOwner({
      type: "quote",
      business,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      quote,
    });
  }

  const appointment =
    analysis.appointmentDraft && !hasExistingAppointment && (!appointmentAvailability || appointmentAvailability.canCreateRequest)
      ? {
          id: crypto.randomUUID(),
          businessId: business.id,
          customerId,
          ...analysis.appointmentDraft,
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

    await notifyBusinessOwner({
      type: "appointment",
      business,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      appointment,
    });
  }

  const response = await provider.send({
    conversationId,
    customerId,
    reply,
    intent: effectiveIntent,
    quote,
    appointment,
  });

  return NextResponse.json(response);
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
