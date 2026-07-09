import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppointmentRequest,
  Business,
  BusinessFaq,
  BusinessHour,
  BusinessLink,
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
    })),
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
