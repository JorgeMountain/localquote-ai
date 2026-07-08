import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AvailabilitySlot,
  AppointmentRequest,
  Business,
  BusinessFaq,
  BusinessHour,
  BusinessLink,
  Conversation,
  Customer,
  Message,
  Profile,
  Quote,
} from "./types";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Profile["role"];
};

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

type BusinessLinkRow = {
  id: string;
  business_id: string;
  label: string;
  url: string;
  purpose: BusinessLink["purpose"];
  notes: string;
  is_active: boolean;
};

type ScheduleAppointmentRow = {
  business_id: string;
  preferred_date: string;
  preferred_time: string;
  status: AppointmentRequest["status"];
};

type BusinessHourRow = {
  id: string;
  business_id: string;
  day_of_week: number;
  opens_at: string;
  closes_at: string;
};

type AvailabilitySlotRow = {
  id: string;
  business_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: AvailabilitySlot["status"];
  notes: string | null;
};

export type DashboardData = {
  viewerProfile: Profile;
  profiles: Profile[];
  businesses: Business[];
  faqs: BusinessFaq[];
  customers: Customer[];
  conversations: Conversation[];
  messages: Message[];
  appointmentRequests: AppointmentRequest[];
  quotes: Quote[];
  businessHours: BusinessHour[];
  availabilitySlots: AvailabilitySlot[];
  businessLinks: BusinessLink[];
};

export async function getDashboardData(supabase: SupabaseClient, ownerId: string): Promise<DashboardData> {
  const viewerProfile = await getProfile(supabase, ownerId);
  const isPlatformAdmin = viewerProfile.role === "platform_admin";
  const businessQuery = supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: true });

  if (!isPlatformAdmin) businessQuery.eq("owner_id", ownerId);

  const { data: businessRows, error: businessesError } = await businessQuery;

  if (businessesError) throw businessesError;

  const businesses = (businessRows ?? []).map(mapBusiness);
  const businessIds = businesses.map((business) => business.id);
  const profiles = isPlatformAdmin ? await getProfiles(supabase) : [viewerProfile];

  if (businessIds.length === 0) {
    return {
      viewerProfile,
      profiles,
      businesses,
      faqs: [],
      customers: [],
      conversations: [],
      messages: [],
      appointmentRequests: [],
      quotes: [],
      businessHours: [],
      availabilitySlots: [],
      businessLinks: [],
    };
  }

  const [
    faqsResult,
    customersResult,
    conversationsResult,
    appointmentsResult,
    quotesResult,
    businessHoursResult,
    availabilitySlotsResult,
    businessLinksResult,
  ] =
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
      supabase.from("business_hours").select("*").in("business_id", businessIds).order("day_of_week"),
      supabase
        .from("availability_slots")
        .select("*")
        .in("business_id", businessIds)
        .order("date")
        .order("start_time"),
      supabase.from("business_links").select("*").in("business_id", businessIds).order("created_at"),
    ]);

  for (const result of [
    faqsResult,
    customersResult,
    conversationsResult,
    appointmentsResult,
    quotesResult,
    businessHoursResult,
    availabilitySlotsResult,
    businessLinksResult,
  ]) {
    if (result.error) throw result.error;
  }

  const conversationIds = (conversationsResult.data ?? []).map((conversation) => conversation.id);
  const messagesResult =
    conversationIds.length > 0
      ? await supabase.from("messages").select("*").in("conversation_id", conversationIds).order("created_at")
      : { data: [], error: null };

  if (messagesResult.error) throw messagesResult.error;

  return {
    viewerProfile,
    profiles,
    businesses,
    faqs: ((faqsResult.data ?? []) as FaqRow[]).map(mapFaq),
    customers: ((customersResult.data ?? []) as CustomerRow[]).map(mapCustomer),
    conversations: ((conversationsResult.data ?? []) as ConversationRow[]).map(mapConversation),
    messages: ((messagesResult.data ?? []) as MessageRow[]).map(mapMessage),
    appointmentRequests: ((appointmentsResult.data ?? []) as AppointmentRow[]).map(mapAppointment),
    quotes: ((quotesResult.data ?? []) as QuoteRow[]).map(mapQuote),
    businessHours: ((businessHoursResult.data ?? []) as BusinessHourRow[]).map(mapBusinessHour),
    availabilitySlots: ((availabilitySlotsResult.data ?? []) as AvailabilitySlotRow[]).map(mapAvailabilitySlot),
    businessLinks: ((businessLinksResult.data ?? []) as BusinessLinkRow[]).map(mapBusinessLink),
  };
}

export async function getProfile(supabase: SupabaseClient, profileId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", profileId)
    .single();

  if (error || !data) throw error ?? new Error("Perfil no encontrado.");
  return mapProfile(data as ProfileRow);
}

async function getProfiles(supabase: SupabaseClient): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as ProfileRow[]).map(mapProfile);
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

export async function getPublicLinks(supabase: SupabaseClient, businessId: string) {
  const { data, error } = await supabase
    .from("business_links")
    .select("id, business_id, label, url, purpose, notes, is_active")
    .eq("business_id", businessId)
    .eq("is_active", true);

  if (error) throw error;
  return ((data ?? []) as BusinessLinkRow[]).map(mapBusinessLink);
}

export async function getPublicSchedule(supabase: SupabaseClient, businessId: string) {
  const [businessHoursResult, availabilitySlotsResult, appointmentsResult] = await Promise.all([
    supabase.from("business_hours").select("*").eq("business_id", businessId),
    supabase.from("availability_slots").select("*").eq("business_id", businessId),
    supabase
      .from("appointment_requests")
      .select("business_id, preferred_date, preferred_time, status")
      .eq("business_id", businessId)
      .in("status", ["pending", "confirmed"]),
  ]);

  for (const result of [businessHoursResult, availabilitySlotsResult, appointmentsResult]) {
    if (result.error) throw result.error;
  }

  return {
    businessHours: ((businessHoursResult.data ?? []) as BusinessHourRow[]).map(mapBusinessHour),
    availabilitySlots: ((availabilitySlotsResult.data ?? []) as AvailabilitySlotRow[]).map(mapAvailabilitySlot),
    appointmentRequests: ((appointmentsResult.data ?? []) as ScheduleAppointmentRow[]).map(mapScheduleAppointment),
  };
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

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email ?? undefined,
    fullName: row.full_name ?? undefined,
    role: row.role,
  };
}

function mapBusinessLink(row: BusinessLinkRow): BusinessLink {
  return {
    id: row.id,
    businessId: row.business_id,
    label: row.label,
    url: row.url,
    purpose: row.purpose,
    notes: row.notes,
    isActive: row.is_active,
  };
}

function mapScheduleAppointment(row: ScheduleAppointmentRow): AppointmentRequest {
  return {
    id: "",
    businessId: row.business_id,
    customerId: "",
    service: "",
    preferredDate: row.preferred_date,
    preferredTime: row.preferred_time,
    status: row.status,
  };
}

function mapBusinessHour(row: BusinessHourRow): BusinessHour {
  return {
    id: row.id,
    businessId: row.business_id,
    dayOfWeek: row.day_of_week,
    opensAt: row.opens_at.slice(0, 5),
    closesAt: row.closes_at.slice(0, 5),
  };
}

function mapAvailabilitySlot(row: AvailabilitySlotRow): AvailabilitySlot {
  return {
    id: row.id,
    businessId: row.business_id,
    date: row.date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    status: row.status,
    notes: row.notes ?? undefined,
  };
}
