import { generateAssistantReply } from "@/lib/ai";
import { canCreateQuote, findMatchingActiveAppointment } from "@/lib/chat-policy";
import {
  createInternalAppointment,
  getInternalChatContext,
  getOrCreateChatSession,
  persistInternalChatTurn,
} from "@/lib/chat-store";
import { analyzeCommercialRequest, buildCommercialReply } from "@/lib/commercial";
import { notifyBusinessOwner } from "@/lib/owner-notifications";
import { buildAvailabilityReply, validateAppointmentAvailability } from "@/lib/schedule";
import { createAnonRouteClient } from "@/lib/supabase/route";
import type { BusinessFaq, ChatResponse, Conversation, Message } from "@/lib/types";

export async function processChatMessage(input: {
  channel: Conversation["channel"];
  slug?: string;
  phoneNumberId?: string;
  customerName?: string;
  customerPhone?: string;
  message: string;
  customerId?: string;
  conversationId?: string;
}): Promise<(ChatResponse & { responsePhoneNumberId?: string }) | null> {
  const supabase = createAnonRouteClient();
  const context = await getInternalChatContext(supabase, {
    slug: input.slug,
    phoneNumberId: input.phoneNumberId,
  });

  if (!context) return null;

  const customerName =
    normalizeOptionalText(input.customerName, 120)
    || (input.channel === "web" ? "Cliente web" : "Cliente WhatsApp");
  const customerPhone =
    normalizeOptionalText(input.customerPhone, 32)
    || (input.channel === "web" ? `web-${crypto.randomUUID().slice(0, 8)}` : "WhatsApp no informado");
  const session = await getOrCreateChatSession(supabase, {
    businessId: context.business.id,
    channel: input.channel,
    customerName,
    customerPhone,
    customerId: input.customerId,
    conversationId: input.conversationId,
  });
  const history: Message[] = session.history.map((message) => ({
    id: crypto.randomUUID(),
    conversationId: session.conversation_id,
    role: message.role,
    body: message.body,
    createdAt: new Date().toISOString(),
  }));
  const commercialContext = [
    ...history.filter((message) => message.role === "customer").map((message) => message.body),
    input.message,
  ]
    .slice(-6)
    .join("\n");
  const analysis = analyzeCommercialRequest(commercialContext, context.business);
  const shouldUseFaqAnswer = analysis.intent === "faq" && hasRelevantFaq(input.message, context.faqs);
  const effectiveIntent = shouldUseFaqAnswer ? "faq" : analysis.intent;
  const matchingAppointment = analysis.appointmentDraft
    ? findMatchingActiveAppointment(context.appointmentRequests, session.customer_id, analysis.appointmentDraft)
    : undefined;
  const appointmentAvailability =
    analysis.appointmentDraft && !matchingAppointment
      ? validateAppointmentAvailability({
          appointment: {
            businessId: context.business.id,
            preferredDate: analysis.appointmentDraft.preferredDate,
            preferredTime: analysis.appointmentDraft.preferredTime,
          },
          businessHours: context.businessHours,
          availabilitySlots: context.availabilitySlots,
          appointmentRequests: context.appointmentRequests,
        })
      : undefined;
  const ai = await generateAssistantReply({
    business: context.business,
    faqs: context.faqs,
    links: context.links,
    history,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    userMessage: input.message,
  });

  let appointment: ChatResponse["appointment"];
  let appointmentRaceLost = false;

  if (
    analysis.appointmentDraft
    && !matchingAppointment
    && (!appointmentAvailability || appointmentAvailability.canCreateRequest)
  ) {
    const candidate = {
      id: crypto.randomUUID(),
      businessId: context.business.id,
      customerId: session.customer_id,
      conversationId: session.conversation_id,
      ...analysis.appointmentDraft,
      status: "pending" as const,
      deliveryStatus: "pending" as const,
    };
    const created = await createInternalAppointment(supabase, candidate);
    if (created) {
      appointment = candidate;
    } else {
      appointmentRaceLost = true;
    }
  }

  const quote =
    analysis.quoteDraft && canCreateQuote(session.has_quote)
      ? {
          id: crypto.randomUUID(),
          businessId: context.business.id,
          customerId: session.customer_id,
          ...analysis.quoteDraft,
          status: "draft" as const,
          deliveryStatus: "pending" as const,
        }
      : undefined;
  const shouldAppendCommercialReply =
    !(matchingAppointment && analysis.appointmentDraft)
    && !(session.has_quote && analysis.quoteDraft);
  const generatedReply = shouldUseFaqAnswer
    ? ai.reply
    : matchingAppointment
      ? `${ai.reply} Ya tengo registrada esa solicitud para el ${matchingAppointment.preferredDate} a las ${matchingAppointment.preferredTime}.`
    : appointmentAvailability && !appointmentAvailability.canCreateRequest
      ? `${ai.reply} ${buildAvailabilityReply(appointmentAvailability)}`
      : appointmentRaceLost
        ? `${ai.reply} Ese horario acaba de ocuparse. Enviame otra hora y la reviso.`
        : shouldAppendCommercialReply
          ? buildCommercialReply(ai.reply, analysis)
            + (appointmentAvailability?.message ? ` ${appointmentAvailability.message}` : "")
          : ai.reply;
  const reply = normalizeReply(generatedReply);
  const persisted = await persistInternalChatTurn(supabase, {
    businessId: context.business.id,
    customerId: session.customer_id,
    conversationId: session.conversation_id,
    intent: effectiveIntent,
    customerMessage: input.message,
    assistantMessage: reply,
    quote,
  });
  const savedQuote = quote && persisted.quote_created ? quote : undefined;

  if (savedQuote) {
    await notifyBusinessOwner({
      type: "quote",
      business: context.business,
      customerName: input.customerName || "No informado",
      customerPhone: input.customerPhone || "No informado",
      quote: savedQuote,
    });
  }

  if (appointment) {
    await notifyBusinessOwner({
      type: "appointment",
      business: context.business,
      customerName: input.customerName || "No informado",
      customerPhone: input.customerPhone || "No informado",
      appointment,
    });
  }

  return {
    conversationId: session.conversation_id,
    customerId: session.customer_id,
    reply,
    intent: effectiveIntent,
    quote: savedQuote,
    appointment,
    responsePhoneNumberId: context.business.whatsappPhoneNumberId ?? input.phoneNumberId,
  };
}

function normalizeOptionalText(value: string | undefined, maxLength: number) {
  const normalized = value?.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function normalizeReply(value: string) {
  const normalized = value.trim();
  return (normalized || "Necesito confirmar esa informacion con el negocio.").slice(0, 3900);
}

function hasRelevantFaq(
  message: string,
  faqs: BusinessFaq[],
) {
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
