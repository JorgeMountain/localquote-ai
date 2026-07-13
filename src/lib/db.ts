import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AvailabilitySlot,
  AppointmentRequest,
  Business,
  BusinessFaq,
  BusinessHour,
  BusinessLink,
  BusinessService,
  Conversation,
  Customer,
  Message,
  PaymentReceipt,
  Profile,
  PublicBusiness,
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
  whatsapp_phone_number_id: string | null;
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
  last_message_at: string;
  last_read_at: string | null;
  internal_notes: string;
  tags: string[];
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
  delivery_status: AppointmentRequest["deliveryStatus"];
  sent_at: string | null;
  error_message: string | null;
  provider_message_id: string | null;
};

type BusinessServiceRow = {
  id: string;
  business_id: string;
  name: string;
  description: string;
  min_price: number | null;
  max_price: number | null;
  duration_minutes: number | null;
  requires_evaluation: boolean;
  is_active: boolean;
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
  delivery_status: Quote["deliveryStatus"];
  sent_at: string | null;
  error_message: string | null;
  provider_message_id: string | null;
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

type PaymentReceiptRow = {
  id: string;
  business_id: string;
  uploaded_by: string;
  reviewed_by: string | null;
  object_path: string;
  original_name: string;
  mime_type: string;
  amount_cents: number | null;
  billing_period: string | null;
  notes: string;
  review_notes: string;
  status: PaymentReceipt["status"];
  created_at: string;
  reviewed_at: string | null;
};

export const pageSize = 20;
export const dashboardPeriodOptions = [7, 30, 90] as const;
export type DashboardPeriodDays = (typeof dashboardPeriodOptions)[number];

export async function getBusinessConfigurationData(supabase: SupabaseClient, userId: string) {
  const access = await getViewerAccess(supabase, userId, true);
  if (access.businessIds.length === 0) {
    return {
      ...access,
      faqs: [] as BusinessFaq[],
      businessServices: [] as BusinessService[],
      businessHours: [] as BusinessHour[],
      availabilitySlots: [] as AvailabilitySlot[],
      businessLinks: [] as BusinessLink[],
    };
  }

  const [faqs, services, hours, slots, links] = await Promise.all([
    supabase.from("business_faqs").select("*").in("business_id", access.businessIds),
    supabase.from("business_services").select("*").in("business_id", access.businessIds).order("created_at"),
    supabase.from("business_hours").select("*").in("business_id", access.businessIds).order("day_of_week"),
    supabase
      .from("availability_slots")
      .select("*")
      .in("business_id", access.businessIds)
      .order("date")
      .order("start_time"),
    supabase.from("business_links").select("*").in("business_id", access.businessIds).order("created_at"),
  ]);
  throwQueryErrors([faqs, services, hours, slots, links]);

  return {
    ...access,
    faqs: ((faqs.data ?? []) as FaqRow[]).map(mapFaq),
    businessServices: ((services.data ?? []) as BusinessServiceRow[]).map(mapBusinessService),
    businessHours: ((hours.data ?? []) as BusinessHourRow[]).map(mapBusinessHour),
    availabilitySlots: ((slots.data ?? []) as AvailabilitySlotRow[]).map(mapAvailabilitySlot),
    businessLinks: ((links.data ?? []) as BusinessLinkRow[]).map(mapBusinessLink),
  };
}

export async function getDashboardOverviewData(
  supabase: SupabaseClient,
  userId: string,
  options: { businessId?: string; periodDays?: number } = {},
) {
  const access = await getViewerAccess(supabase, userId);
  const periodDays = normalizeDashboardPeriodDays(options.periodDays);
  const businessIds = scopedBusinessIds(access.businesses, options.businessId);
  if (businessIds.length === 0) {
    return {
      ...access,
      activeBusinessId: undefined,
      periodDays,
      newCustomersCount: 0,
      conversationsCount: 0,
      pendingAppointmentsCount: 0,
      confirmedAppointmentsCount: 0,
      quotesSentCount: 0,
      quotesAcceptedCount: 0,
      conversionRate: 0,
      totalQuoted: 0,
      estimatedAiCost: 0,
      conversations: [] as Conversation[],
      customers: [] as Customer[],
    };
  }

  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

  const [customersCount, conversations, appointmentRows, quoteRows, aiRows] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .in("business_id", businessIds)
      .gte("created_at", since),
    supabase
      .from("conversations")
      .select("*", { count: "exact" })
      .in("business_id", businessIds)
      .gte("last_message_at", since)
      .order("last_message_at", { ascending: false })
      .limit(10),
    supabase
      .from("appointment_requests")
      .select("status")
      .in("business_id", businessIds)
      .gte("created_at", since),
    supabase
      .from("quotes")
      .select("status,max_price")
      .in("business_id", businessIds)
      .gte("created_at", since),
    supabase
      .from("ai_generations")
      .select("estimated_cost")
      .in("business_id", businessIds)
      .gte("created_at", since),
  ]);
  throwQueryErrors([customersCount, conversations, appointmentRows, quoteRows, aiRows]);

  const conversationRows = (conversations.data ?? []) as ConversationRow[];
  const customerIds = [...new Set(conversationRows.map((conversation) => conversation.customer_id))];
  const customers = await getCustomersByIds(supabase, customerIds);
  const appointments = (appointmentRows.data ?? []) as Array<{ status: AppointmentRequest["status"] }>;
  const quotes = (quoteRows.data ?? []) as Array<{ status: Quote["status"]; max_price: number }>;
  const aiGenerations = (aiRows.data ?? []) as Array<{ estimated_cost: number }>;
  const quotesAcceptedCount = quotes.filter((quote) => quote.status === "accepted").length;

  return {
    ...access,
    activeBusinessId: resolveRequestedBusinessId(access.businesses, options.businessId),
    periodDays,
    newCustomersCount: customersCount.count ?? 0,
    conversationsCount: conversations.count ?? 0,
    pendingAppointmentsCount: appointments.filter((appointment) => appointment.status === "pending").length,
    confirmedAppointmentsCount: appointments.filter((appointment) => appointment.status === "confirmed").length,
    quotesSentCount: quotes.filter((quote) => quote.status === "sent").length,
    quotesAcceptedCount,
    conversionRate:
      customersCount.count && customersCount.count > 0
        ? Math.round((quotesAcceptedCount / customersCount.count) * 100)
        : 0,
    totalQuoted: quotes
      .filter((quote) => quote.status !== "rejected")
      .reduce((sum, quote) => sum + quote.max_price, 0),
    estimatedAiCost: aiGenerations.reduce((sum, generation) => sum + Number(generation.estimated_cost || 0), 0),
    conversations: conversationRows.map(mapConversation),
    customers,
  };
}

export async function getConversationsPageData(
  supabase: SupabaseClient,
  userId: string,
  options: { businessId?: string; search?: string; page?: number; conversationId?: string },
) {
  const access = await getViewerAccess(supabase, userId);
  const businessIds = scopedBusinessIds(access.businesses, options.businessId);
  const page = normalizePage(options.page);
  const searchScope = await getSearchScope(supabase, access.businesses, businessIds, options.search);
  let query = supabase.from("conversations").select("*", { count: "exact" }).in("business_id", businessIds);
  query = applyConversationSearch(query, searchScope);
  const result = await query
    .order("last_message_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (result.error) throw result.error;

  const conversations = ((result.data ?? []) as ConversationRow[]).map(mapConversation);
  const selectedConversation =
    conversations.find((conversation) => conversation.id === options.conversationId) ?? conversations[0];
  const customerIds = [...new Set(conversations.map((conversation) => conversation.customerId))];
  const customers = await getCustomersByIds(supabase, customerIds);
  const selectedCustomer = selectedConversation
    ? customers.find((customer) => customer.id === selectedConversation.customerId)
    : undefined;

  const [messages, appointments, quotes] = selectedConversation && selectedCustomer
    ? await Promise.all([
        supabase.from("messages").select("*").eq("conversation_id", selectedConversation.id).order("created_at"),
        supabase.from("appointment_requests").select("*").eq("customer_id", selectedCustomer.id).order("created_at", { ascending: false }),
        supabase.from("quotes").select("*").eq("customer_id", selectedCustomer.id).order("created_at", { ascending: false }),
      ])
    : [emptyQueryResult(), emptyQueryResult(), emptyQueryResult()];
  throwQueryErrors([messages, appointments, quotes]);

  return {
    ...access,
    activeBusinessId: resolveRequestedBusinessId(access.businesses, options.businessId),
    conversations,
    customers,
    selectedConversation,
    selectedCustomer,
    messages: ((messages.data ?? []) as MessageRow[]).map(mapMessage),
    appointmentRequests: ((appointments.data ?? []) as AppointmentRow[]).map(mapAppointment),
    quotes: ((quotes.data ?? []) as QuoteRow[]).map(mapQuote),
    page,
    totalPages: Math.max(1, Math.ceil((result.count ?? 0) / pageSize)),
  };
}

export async function getAppointmentsPageData(
  supabase: SupabaseClient,
  userId: string,
  options: { businessId?: string; search?: string; page?: number },
) {
  const access = await getViewerAccess(supabase, userId);
  const businessIds = scopedBusinessIds(access.businesses, options.businessId);
  const page = normalizePage(options.page);
  const searchScope = await getSearchScope(supabase, access.businesses, businessIds, options.search);
  let query = supabase.from("appointment_requests").select("*", { count: "exact" }).in("business_id", businessIds);
  query = applyCommercialSearch(query, searchScope, "service");
  const result = await query
    .order("preferred_date", { ascending: false })
    .order("preferred_time", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (result.error) throw result.error;
  const appointments = ((result.data ?? []) as AppointmentRow[]).map(mapAppointment);

  return {
    ...access,
    activeBusinessId: resolveRequestedBusinessId(access.businesses, options.businessId),
    appointmentRequests: appointments,
    customers: await getCustomersByIds(supabase, [...new Set(appointments.map((item) => item.customerId))]),
    page,
    totalPages: Math.max(1, Math.ceil((result.count ?? 0) / pageSize)),
  };
}

export async function getQuotesPageData(
  supabase: SupabaseClient,
  userId: string,
  options: { businessId?: string; search?: string; page?: number },
) {
  const access = await getViewerAccess(supabase, userId);
  const businessIds = scopedBusinessIds(access.businesses, options.businessId);
  const page = normalizePage(options.page);
  const searchScope = await getSearchScope(supabase, access.businesses, businessIds, options.search);
  let query = supabase.from("quotes").select("*", { count: "exact" }).in("business_id", businessIds);
  query = applyCommercialSearch(query, searchScope, "service");
  const result = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (result.error) throw result.error;
  const quotes = ((result.data ?? []) as QuoteRow[]).map(mapQuote);

  return {
    ...access,
    activeBusinessId: resolveRequestedBusinessId(access.businesses, options.businessId),
    quotes,
    customers: await getCustomersByIds(supabase, [...new Set(quotes.map((item) => item.customerId))]),
    page,
    totalPages: Math.max(1, Math.ceil((result.count ?? 0) / pageSize)),
  };
}

export async function getPaymentsPageData(
  supabase: SupabaseClient,
  userId: string,
  options: { businessId?: string; search?: string; page?: number },
) {
  const access = await getViewerAccess(supabase, userId);
  const businessIds = scopedBusinessIds(access.businesses, options.businessId);
  const page = normalizePage(options.page);
  const search = normalizeSearch(options.search);
  const matchingBusinessIds = search
    ? businessIds.filter((id) => access.businesses.find((business) => business.id === id)?.name.toLowerCase().includes(search))
    : businessIds;
  let query = supabase.from("payment_receipts").select("*", { count: "exact" }).in("business_id", businessIds);
  if (search) {
    const filters = [`original_name.ilike.%${search}%`, `billing_period.ilike.%${search}%`];
    if (matchingBusinessIds.length > 0) filters.push(`business_id.in.(${matchingBusinessIds.join(",")})`);
    query = query.or(filters.join(","));
  }
  const result = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (result.error) throw result.error;

  return {
    ...access,
    activeBusinessId: resolveRequestedBusinessId(access.businesses, options.businessId),
    paymentReceipts: ((result.data ?? []) as PaymentReceiptRow[]).map(mapPaymentReceipt),
    page,
    totalPages: Math.max(1, Math.ceil((result.count ?? 0) / pageSize)),
  };
}

export async function getAdminPageData(supabase: SupabaseClient, userId: string) {
  const access = await getViewerAccess(supabase, userId, true);
  if (access.viewerProfile.role !== "platform_admin" || access.businessIds.length === 0) {
    return { ...access, customerBusinessIds: [] as string[], appointmentBusinessIds: [] as string[], quoteBusinessIds: [] as string[], conversationsCount: 0 };
  }
  const [customers, appointments, quotes, conversations] = await Promise.all([
    supabase.from("customers").select("business_id").in("business_id", access.businessIds),
    supabase.from("appointment_requests").select("business_id").in("business_id", access.businessIds),
    supabase.from("quotes").select("business_id").in("business_id", access.businessIds),
    supabase.from("conversations").select("id", { count: "exact", head: true }).in("business_id", access.businessIds),
  ]);
  throwQueryErrors([customers, appointments, quotes, conversations]);
  return {
    ...access,
    customerBusinessIds: (customers.data ?? []).map((row) => row.business_id),
    appointmentBusinessIds: (appointments.data ?? []).map((row) => row.business_id),
    quoteBusinessIds: (quotes.data ?? []).map((row) => row.business_id),
    conversationsCount: conversations.count ?? 0,
  };
}

type SearchScope = {
  value: string;
  customerIds: string[];
  businessIds: string[];
};

const emptyBusinessId = "00000000-0000-0000-0000-000000000000";

async function getViewerAccess(supabase: SupabaseClient, userId: string, includeProfiles = false) {
  const viewerProfile = await getProfile(supabase, userId);
  const businessQuery = supabase.from("businesses").select("*").order("created_at");
  if (viewerProfile.role !== "platform_admin") businessQuery.eq("owner_id", userId);
  const { data, error } = await businessQuery;
  if (error) throw error;
  const businesses = ((data ?? []) as BusinessRow[]).map(mapBusiness);

  return {
    viewerProfile,
    profiles: includeProfiles && viewerProfile.role === "platform_admin" ? await getProfiles(supabase) : [viewerProfile],
    businesses,
    businessIds: businesses.map((business) => business.id),
  };
}

function resolveRequestedBusinessId(businesses: Business[], requestedBusinessId?: string) {
  return businesses.some((business) => business.id === requestedBusinessId) ? requestedBusinessId : undefined;
}

function scopedBusinessIds(businesses: Business[], requestedBusinessId?: string) {
  const activeBusinessId = resolveRequestedBusinessId(businesses, requestedBusinessId);
  const ids = activeBusinessId ? [activeBusinessId] : businesses.map((business) => business.id);
  return ids.length > 0 ? ids : [emptyBusinessId];
}

async function getCustomersByIds(supabase: SupabaseClient, customerIds: string[]) {
  if (customerIds.length === 0) return [] as Customer[];
  const { data, error } = await supabase.from("customers").select("*").in("id", customerIds);
  if (error) throw error;
  return ((data ?? []) as CustomerRow[]).map(mapCustomer);
}

async function getSearchScope(
  supabase: SupabaseClient,
  businesses: Business[],
  businessIds: string[],
  rawSearch?: string,
): Promise<SearchScope> {
  const value = normalizeSearch(rawSearch);
  if (!value) return { value: "", customerIds: [], businessIds: [] };

  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .in("business_id", businessIds)
    .or(`name.ilike.%${value}%,phone.ilike.%${value}%`)
    .limit(200);
  if (error) throw error;

  return {
    value,
    customerIds: (data ?? []).map((customer) => customer.id),
    businessIds: businesses
      .filter((business) => businessIds.includes(business.id) && business.name.toLowerCase().includes(value))
      .map((business) => business.id),
  };
}

function applyConversationSearch<T extends { or: (filters: string) => T }>(query: T, scope: SearchScope) {
  if (!scope.value) return query;
  const filters = buildRelationshipFilters(scope);
  return query.or(filters.length > 0 ? filters.join(",") : `id.eq.${emptyBusinessId}`);
}

function applyCommercialSearch<T extends { or: (filters: string) => T }>(
  query: T,
  scope: SearchScope,
  textColumn: string,
) {
  if (!scope.value) return query;
  const filters = [...buildRelationshipFilters(scope), `${textColumn}.ilike.%${scope.value}%`];
  return query.or(filters.join(","));
}

function buildRelationshipFilters(scope: SearchScope) {
  const filters: string[] = [];
  if (scope.customerIds.length > 0) filters.push(`customer_id.in.(${scope.customerIds.join(",")})`);
  if (scope.businessIds.length > 0) filters.push(`business_id.in.(${scope.businessIds.join(",")})`);
  return filters;
}

function normalizeSearch(value?: string) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function normalizePage(value?: number) {
  return Number.isInteger(value) && (value ?? 0) > 0 ? value! : 1;
}

export function normalizeDashboardPeriodDays(value?: number): DashboardPeriodDays {
  return dashboardPeriodOptions.includes(value as DashboardPeriodDays) ? (value as DashboardPeriodDays) : 30;
}

function emptyQueryResult() {
  return { data: [], error: null };
}

function throwQueryErrors(results: Array<{ error: unknown }>) {
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
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
    .select("id, name, slug, type, description, services, hours, location, phone")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return mapPublicBusiness(data as Omit<BusinessRow, "owner_id" | "rules" | "whatsapp_phone_number_id">);
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
    whatsappPhoneNumberId: row.whatsapp_phone_number_id ?? undefined,
  };
}

function mapPublicBusiness(
  row: Omit<BusinessRow, "owner_id" | "rules" | "whatsapp_phone_number_id">,
): PublicBusiness {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    description: row.description,
    services: row.services,
    hours: row.hours,
    location: row.location,
    phone: row.phone,
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
    lastMessageAt: row.last_message_at,
    lastReadAt: row.last_read_at ?? undefined,
    internalNotes: row.internal_notes,
    tags: row.tags ?? [],
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
    deliveryStatus: row.delivery_status,
    sentAt: row.sent_at ?? undefined,
    errorMessage: row.error_message ?? undefined,
    providerMessageId: row.provider_message_id ?? undefined,
  };
}

function mapBusinessService(row: BusinessServiceRow): BusinessService {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    minPrice: row.min_price ?? undefined,
    maxPrice: row.max_price ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    requiresEvaluation: row.requires_evaluation,
    isActive: row.is_active,
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
    deliveryStatus: row.delivery_status,
    sentAt: row.sent_at ?? undefined,
    errorMessage: row.error_message ?? undefined,
    providerMessageId: row.provider_message_id ?? undefined,
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

function mapPaymentReceipt(row: PaymentReceiptRow): PaymentReceipt {
  return {
    id: row.id,
    businessId: row.business_id,
    uploadedBy: row.uploaded_by,
    reviewedBy: row.reviewed_by ?? undefined,
    objectPath: row.object_path,
    originalName: row.original_name,
    mimeType: row.mime_type,
    amountCents: row.amount_cents ?? undefined,
    billingPeriod: row.billing_period ?? undefined,
    notes: row.notes,
    reviewNotes: row.review_notes,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at ?? undefined,
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
