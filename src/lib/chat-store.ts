import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AiGeneration,
  AppointmentRequest,
  Business,
  BusinessFaq,
  BusinessHour,
  BusinessLink,
  BusinessService,
  AvailabilitySlot,
  Conversation,
  Message,
  Quote,
} from "@/lib/types";

type ChatContextPayload = {
  business: {
    id: string;
    owner_id: string;
    name: string;
    slug: string;
    type: Business["type"];
    description: string;
    services: string[];
    hours: string;
    location: string;
    phone: string;
    rules: string[];
    whatsapp_phone_number_id: string | null;
  };
  business_services: Array<{
    id: string;
    business_id: string;
    name: string;
    description: string;
    min_price: number | null;
    max_price: number | null;
    duration_minutes: number | null;
    requires_evaluation: boolean;
    is_active: boolean;
  }>;
  faqs: Array<{
    id: string;
    business_id: string;
    question: string;
    answer: string;
    category: string | null;
  }>;
  links: Array<{
    id: string;
    business_id: string;
    label: string;
    url: string;
    purpose: BusinessLink["purpose"];
    notes: string;
    is_active: boolean;
  }>;
  business_hours: Array<{
    id: string;
    business_id: string;
    day_of_week: number;
    opens_at: string;
    closes_at: string;
  }>;
  availability_slots: Array<{
    id: string;
    business_id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: AvailabilitySlot["status"];
    notes: string | null;
  }>;
  appointment_requests: Array<{
    id: string;
    business_id: string;
    customer_id: string;
    service: string;
    preferred_date: string;
    preferred_time: string;
    status: AppointmentRequest["status"];
  }>;
};

type ChatSessionPayload = {
  customer_id: string;
  conversation_id: string;
  history: Pick<Message, "role" | "body">[];
  has_appointment: boolean;
  has_quote: boolean;
};

export type InternalChatContext = {
  business: Business;
  faqs: BusinessFaq[];
  links: BusinessLink[];
  businessHours: BusinessHour[];
  availabilitySlots: AvailabilitySlot[];
  appointmentRequests: AppointmentRequest[];
  businessServices: BusinessService[];
};

function getInternalToken() {
  const token = process.env.INTERNAL_API_TOKEN ?? process.env.WHATSAPP_VERIFY_TOKEN;
  if (!token) throw new Error("Missing INTERNAL_API_TOKEN.");
  return token;
}

export async function getInternalChatContext(
  supabase: SupabaseClient,
  selector: { slug?: string; phoneNumberId?: string },
): Promise<InternalChatContext | null> {
  const { data, error } = await supabase.rpc("get_chat_context", {
    p_token: getInternalToken(),
    p_slug: selector.slug ?? null,
    p_phone_number_id: selector.phoneNumberId ?? null,
  });

  if (error) throw error;
  if (!data) return null;

  const payload = data as ChatContextPayload;
  return {
    business: {
      id: payload.business.id,
      ownerId: payload.business.owner_id,
      name: payload.business.name,
      slug: payload.business.slug,
      type: payload.business.type,
      description: payload.business.description,
      services: payload.business.services,
      hours: payload.business.hours,
      location: payload.business.location,
      phone: payload.business.phone,
      rules: payload.business.rules,
      whatsappPhoneNumberId: payload.business.whatsapp_phone_number_id ?? undefined,
      structuredServices: payload.business_services.map(mapBusinessService),
    },
    faqs: payload.faqs.map((faq) => ({
      id: faq.id,
      businessId: faq.business_id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category ?? undefined,
    })),
    links: payload.links.map((link) => ({
      id: link.id,
      businessId: link.business_id,
      label: link.label,
      url: link.url,
      purpose: link.purpose,
      notes: link.notes,
      isActive: link.is_active,
    })),
    businessHours: payload.business_hours.map((hour) => ({
      id: hour.id,
      businessId: hour.business_id,
      dayOfWeek: hour.day_of_week,
      opensAt: hour.opens_at,
      closesAt: hour.closes_at,
    })),
    availabilitySlots: payload.availability_slots.map((slot) => ({
      id: slot.id,
      businessId: slot.business_id,
      date: slot.date,
      startTime: slot.start_time,
      endTime: slot.end_time,
      status: slot.status,
      notes: slot.notes ?? undefined,
    })),
    appointmentRequests: payload.appointment_requests.map((appointment) => ({
      id: appointment.id,
      businessId: appointment.business_id,
      customerId: appointment.customer_id,
      service: appointment.service,
      preferredDate: appointment.preferred_date,
      preferredTime: appointment.preferred_time,
      status: appointment.status,
      deliveryStatus: "pending",
    })),
    businessServices: payload.business_services.map(mapBusinessService),
  };
}

function mapBusinessService(service: ChatContextPayload["business_services"][number]): BusinessService {
  return {
    id: service.id,
    businessId: service.business_id,
    name: service.name,
    description: service.description,
    minPrice: service.min_price ?? undefined,
    maxPrice: service.max_price ?? undefined,
    durationMinutes: service.duration_minutes ?? undefined,
    requiresEvaluation: service.requires_evaluation,
    isActive: service.is_active,
  };
}

export async function getOrCreateChatSession(
  supabase: SupabaseClient,
  input: {
    businessId: string;
    channel: Conversation["channel"];
    customerName: string;
    customerPhone: string;
    customerId?: string;
    conversationId?: string;
  },
) {
  const { data, error } = await supabase.rpc("get_or_create_chat_session", {
    p_token: getInternalToken(),
    p_business_id: input.businessId,
    p_channel: input.channel,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_customer_id: input.customerId ?? null,
    p_conversation_id: input.conversationId ?? null,
  });

  if (error) throw error;
  return data as ChatSessionPayload;
}

export async function createInternalAppointment(
  supabase: SupabaseClient,
  appointment: AppointmentRequest & { conversationId: string },
) {
  const { data, error } = await supabase.rpc("create_internal_appointment", {
    p_token: getInternalToken(),
    p_id: appointment.id,
    p_business_id: appointment.businessId,
    p_customer_id: appointment.customerId,
    p_conversation_id: appointment.conversationId,
    p_service: appointment.service,
    p_preferred_date: appointment.preferredDate,
    p_preferred_time: appointment.preferredTime,
  });

  if (error) throw error;
  return Boolean(data);
}

export async function persistInternalChatTurn(
  supabase: SupabaseClient,
  input: {
    businessId: string;
    customerId: string;
    conversationId: string;
    intent: Conversation["lastIntent"];
    customerMessage: string;
    assistantMessage: string;
    quote?: Quote;
  },
) {
  const { data, error } = await supabase.rpc("persist_internal_chat_turn", {
    p_token: getInternalToken(),
    p_business_id: input.businessId,
    p_customer_id: input.customerId,
    p_conversation_id: input.conversationId,
    p_intent: input.intent,
    p_customer_message: input.customerMessage,
    p_assistant_message: input.assistantMessage,
    p_quote: input.quote
      ? {
          id: input.quote.id,
          service: input.quote.service,
          description: input.quote.description,
          min_price: input.quote.minPrice,
          max_price: input.quote.maxPrice,
          notes: input.quote.notes,
        }
      : null,
  });

  if (error) throw error;
  return data as { quote_created: boolean };
}

export async function recordInternalAiGeneration(
  supabase: SupabaseClient,
  input: Pick<
    AiGeneration,
    "businessId" | "conversationId" | "provider" | "model" | "inputTokens" | "outputTokens" | "estimatedCost" | "latencyMs" | "status" | "errorMessage"
  >,
) {
  const { error } = await supabase.rpc("record_internal_ai_generation", {
    p_token: getInternalToken(),
    p_business_id: input.businessId,
    p_conversation_id: input.conversationId,
    p_provider: input.provider,
    p_model: input.model,
    p_input_tokens: input.inputTokens ?? 0,
    p_output_tokens: input.outputTokens ?? 0,
    p_estimated_cost: input.estimatedCost,
    p_latency_ms: input.latencyMs ?? 0,
    p_status: input.status,
    p_error_message: input.errorMessage,
  });

  if (error) throw error;
}

export async function consumeInternalRateLimit(
  supabase: SupabaseClient,
  rateKey: string,
  maxRequests: number,
  windowSeconds: number,
) {
  const { data, error } = await supabase.rpc("consume_internal_rate_limit", {
    p_token: getInternalToken(),
    p_rate_key: rateKey,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });

  if (error) throw error;
  return Boolean(data);
}

export async function claimWhatsAppEvent(
  supabase: SupabaseClient,
  eventId: string,
  businessId: string,
) {
  const { data, error } = await supabase.rpc("claim_internal_whatsapp_event", {
    p_token: getInternalToken(),
    p_event_id: eventId,
    p_business_id: businessId,
  });

  if (error) throw error;
  return Boolean(data);
}

export async function finishWhatsAppEvent(
  supabase: SupabaseClient,
  eventId: string,
  succeeded: boolean,
) {
  const { error } = await supabase.rpc("finish_internal_whatsapp_event", {
    p_token: getInternalToken(),
    p_event_id: eventId,
    p_succeeded: succeeded,
  });

  if (error) throw error;
}

export type WhatsAppOutboxJob = {
  id: string;
  eventId: string;
  businessId: string;
  sourcePhoneNumberId: string;
  customerName?: string;
  customerPhone: string;
  incomingMessage: string;
  messageType: string;
  attempts: number;
  maxAttempts: number;
};

export type WhatsAppOutboxOutcome = {
  status: "pending" | "processing" | "sent" | "failed";
  retryScheduled: boolean;
  attempts?: number;
  maxAttempts?: number;
};

export async function enqueueWhatsAppOutbox(
  supabase: SupabaseClient,
  input: {
    eventId: string;
    businessId: string;
    sourcePhoneNumberId: string;
    customerName?: string;
    customerPhone: string;
    incomingMessage: string;
    messageType: string;
  },
) {
  const { data, error } = await supabase.rpc("enqueue_internal_whatsapp_outbox", {
    p_token: getInternalToken(),
    p_event_id: input.eventId,
    p_business_id: input.businessId,
    p_source_phone_number_id: input.sourcePhoneNumberId,
    p_customer_name: input.customerName ?? "",
    p_customer_phone: input.customerPhone,
    p_incoming_message: input.incomingMessage,
    p_message_type: input.messageType,
  });

  if (error) throw error;
  return Boolean(data);
}

export async function claimWhatsAppOutbox(supabase: SupabaseClient): Promise<WhatsAppOutboxJob | null> {
  const { data, error } = await supabase.rpc("claim_internal_whatsapp_outbox", {
    p_token: getInternalToken(),
  });

  if (error) throw error;
  return parseWhatsAppOutboxJob(data);
}

export async function finishWhatsAppOutbox(
  supabase: SupabaseClient,
  input: {
    outboxId: string;
    succeeded: boolean;
    providerMessageId?: string;
    errorCode?: string;
  },
): Promise<WhatsAppOutboxOutcome> {
  const { data, error } = await supabase.rpc("finish_internal_whatsapp_outbox", {
    p_token: getInternalToken(),
    p_outbox_id: input.outboxId,
    p_succeeded: input.succeeded,
    p_provider_message_id: input.providerMessageId,
    p_error_code: input.errorCode,
  });

  if (error) throw error;
  return parseWhatsAppOutboxOutcome(data);
}

function parseWhatsAppOutboxJob(value: unknown): WhatsAppOutboxJob | null {
  if (!value || typeof value !== "object") return null;
  const job = value as Record<string, unknown>;
  if (
    typeof job.id !== "string"
    || typeof job.event_id !== "string"
    || typeof job.business_id !== "string"
    || typeof job.source_phone_number_id !== "string"
    || typeof job.customer_phone !== "string"
    || typeof job.incoming_message !== "string"
    || typeof job.message_type !== "string"
    || typeof job.attempts !== "number"
    || typeof job.max_attempts !== "number"
  ) {
    throw new Error("Invalid WhatsApp outbox job.");
  }

  return {
    id: job.id,
    eventId: job.event_id,
    businessId: job.business_id,
    sourcePhoneNumberId: job.source_phone_number_id,
    customerName: typeof job.customer_name === "string" ? job.customer_name : undefined,
    customerPhone: job.customer_phone,
    incomingMessage: job.incoming_message,
    messageType: job.message_type,
    attempts: job.attempts,
    maxAttempts: job.max_attempts,
  };
}

function parseWhatsAppOutboxOutcome(value: unknown): WhatsAppOutboxOutcome {
  if (!value || typeof value !== "object") throw new Error("Invalid WhatsApp outbox outcome.");
  const outcome = value as Record<string, unknown>;
  if (
    (outcome.status !== "pending" && outcome.status !== "processing" && outcome.status !== "sent" && outcome.status !== "failed")
    || typeof outcome.retry_scheduled !== "boolean"
  ) {
    throw new Error("Invalid WhatsApp outbox outcome.");
  }

  return {
    status: outcome.status,
    retryScheduled: outcome.retry_scheduled,
    attempts: typeof outcome.attempts === "number" ? outcome.attempts : undefined,
    maxAttempts: typeof outcome.max_attempts === "number" ? outcome.max_attempts : undefined,
  };
}
