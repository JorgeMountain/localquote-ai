import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppointmentRequest,
  Business,
  BusinessFaq,
  Conversation,
  Customer,
  Message,
  Quote,
} from "./types";

type BusinessRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  type: "dentist" | "repair";
  description: string;
  services: string[];
  hours: string;
  location: string;
  phone: string;
  rules: string[];
};

type FaqRow = {
  id: string;
  business_id: string;
  question: string;
  answer: string;
  category: string | null;
};

type CustomerRow = {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  status: Customer["status"];
  created_at: string;
};

type ConversationRow = {
  id: string;
  business_id: string;
  customer_id: string;
  channel: Conversation["channel"];
  last_intent: Conversation["lastIntent"];
  created_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: Message["role"];
  body: string;
  created_at: string;
};

type AppointmentRow = {
  id: string;
  business_id: string;
  customer_id: string;
  service: string;
  preferred_date: string;
  preferred_time: string;
  status: AppointmentRequest["status"];
};

type QuoteRow = {
  id: string;
  business_id: string;
  customer_id: string;
  service: string;
  description: string;
  min_price: number;
  max_price: number;
  notes: string;
  status: Quote["status"];
};

export type DashboardData = {
  businesses: Business[];
  faqs: BusinessFaq[];
  customers: Customer[];
  conversations: Conversation[];
  messages: Message[];
  appointmentRequests: AppointmentRequest[];
  quotes: Quote[];
};

export async function getDashboardData(supabase: SupabaseClient, ownerId: string): Promise<DashboardData> {
  const { data: businessRows, error: businessesError } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  if (businessesError) throw businessesError;

  const businesses = (businessRows ?? []).map(mapBusiness);
  const businessIds = businesses.map((business) => business.id);

  if (businessIds.length === 0) {
    return {
      businesses,
      faqs: [],
      customers: [],
      conversations: [],
      messages: [],
      appointmentRequests: [],
      quotes: [],
    };
  }

  const [faqsResult, customersResult, conversationsResult, appointmentsResult, quotesResult] =
    await Promise.all([
      supabase.from("business_faqs").select("*").in("business_id", businessIds),
      supabase.from("customers").select("*").in("business_id", businessIds).order("created_at", { ascending: false }),
      supabase
        .from("conversations")
        .select("*")
        .in("business_id", businessIds)
        .order("created_at", { ascending: false }),
      supabase.from("appointment_requests").select("*").in("business_id", businessIds),
      supabase.from("quotes").select("*").in("business_id", businessIds),
    ]);

  for (const result of [faqsResult, customersResult, conversationsResult, appointmentsResult, quotesResult]) {
    if (result.error) throw result.error;
  }

  const conversationIds = (conversationsResult.data ?? []).map((conversation) => conversation.id);
  const messagesResult =
    conversationIds.length > 0
      ? await supabase.from("messages").select("*").in("conversation_id", conversationIds).order("created_at")
      : { data: [], error: null };

  if (messagesResult.error) throw messagesResult.error;

  return {
    businesses,
    faqs: ((faqsResult.data ?? []) as FaqRow[]).map(mapFaq),
    customers: ((customersResult.data ?? []) as CustomerRow[]).map(mapCustomer),
    conversations: ((conversationsResult.data ?? []) as ConversationRow[]).map(mapConversation),
    messages: ((messagesResult.data ?? []) as MessageRow[]).map(mapMessage),
    appointmentRequests: ((appointmentsResult.data ?? []) as AppointmentRow[]).map(mapAppointment),
    quotes: ((quotesResult.data ?? []) as QuoteRow[]).map(mapQuote),
  };
}

export async function getPublicBusiness(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, owner_id, name, slug, type, description, services, hours, location, phone, rules")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return mapBusiness(data as BusinessRow);
}

export async function getPublicFaqs(supabase: SupabaseClient, businessId: string) {
  const { data, error } = await supabase
    .from("business_faqs")
    .select("id, business_id, question, answer, category")
    .eq("business_id", businessId);

  if (error) throw error;
  return ((data ?? []) as FaqRow[]).map(mapFaq);
}

function mapBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    description: row.description,
    services: row.services,
    hours: row.hours,
    location: row.location,
    phone: row.phone,
    rules: row.rules,
  };
}

function mapFaq(row: FaqRow): BusinessFaq {
  return {
    id: row.id,
    businessId: row.business_id,
    question: row.question,
    answer: row.answer,
    category: row.category ?? undefined,
  };
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    phone: row.phone,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    channel: row.channel,
    lastIntent: row.last_intent,
    createdAt: row.created_at,
  };
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapAppointment(row: AppointmentRow): AppointmentRequest {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    service: row.service,
    preferredDate: row.preferred_date,
    preferredTime: row.preferred_time,
    status: row.status,
  };
}

function mapQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    service: row.service,
    description: row.description,
    minPrice: row.min_price,
    maxPrice: row.max_price,
    notes: row.notes,
    status: row.status,
  };
}
