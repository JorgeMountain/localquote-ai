export type BusinessType = "dentist" | "repair";

export type ProfileRole = "platform_admin" | "business_owner";

export type Profile = {
  id: string;
  email?: string;
  fullName?: string;
  role: ProfileRole;
};

export type LeadStatus = "new" | "qualified" | "appointment" | "quoted";

export type AppointmentStatus = "pending" | "confirmed" | "cancelled";

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";

export type DeliveryStatus = "pending" | "sent" | "failed";

export type AvailabilityStatus = "available" | "blocked" | "booked";

export type BusinessLinkPurpose = "general" | "booking" | "payment" | "catalog" | "location" | "support";

export type PaymentReceiptStatus = "pending" | "approved" | "rejected";

export type Business = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  type: BusinessType;
  description: string;
  services: string[];
  hours: string;
  location: string;
  phone: string;
  rules: string[];
  whatsappPhoneNumberId?: string;
  structuredServices?: BusinessService[];
};

export type BusinessService = {
  id: string;
  businessId: string;
  name: string;
  description: string;
  minPrice?: number;
  maxPrice?: number;
  durationMinutes?: number;
  requiresEvaluation: boolean;
  isActive: boolean;
};

export type PublicBusiness = Omit<Business, "ownerId" | "rules" | "whatsappPhoneNumberId">;

export type BusinessFaq = {
  id: string;
  businessId: string;
  question: string;
  answer: string;
  category?: string;
};

export type BusinessLink = {
  id: string;
  businessId: string;
  label: string;
  url: string;
  purpose: BusinessLinkPurpose;
  notes: string;
  isActive: boolean;
};

export type Customer = {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  status: LeadStatus;
  createdAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  role: "assistant" | "customer";
  body: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  businessId: string;
  customerId: string;
  channel: "web" | "whatsapp";
  lastIntent: "faq" | "quote" | "appointment" | "handoff";
  createdAt: string;
};

export type AppointmentRequest = {
  id: string;
  businessId: string;
  customerId: string;
  service: string;
  preferredDate: string;
  preferredTime: string;
  status: AppointmentStatus;
  deliveryStatus: DeliveryStatus;
  sentAt?: string;
  errorMessage?: string;
  providerMessageId?: string;
};

export type Quote = {
  id: string;
  businessId: string;
  customerId: string;
  service: string;
  description: string;
  minPrice: number;
  maxPrice: number;
  notes: string;
  status: QuoteStatus;
  deliveryStatus: DeliveryStatus;
  sentAt?: string;
  errorMessage?: string;
  providerMessageId?: string;
};

export type ChatRequest = {
  slug: string;
  customerName?: string;
  customerPhone?: string;
  message: string;
  conversationId?: string;
  customerId?: string;
};

export type BusinessHour = {
  id: string;
  businessId: string;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
};

export type AvailabilitySlot = {
  id: string;
  businessId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AvailabilityStatus;
  notes?: string;
};

export type PaymentReceipt = {
  id: string;
  businessId: string;
  uploadedBy: string;
  reviewedBy?: string;
  objectPath: string;
  originalName: string;
  mimeType: string;
  amountCents?: number;
  billingPeriod?: string;
  notes: string;
  reviewNotes: string;
  status: PaymentReceiptStatus;
  createdAt: string;
  reviewedAt?: string;
};

export type ChatResponse = {
  conversationId: string;
  customerId: string;
  reply: string;
  intent: Conversation["lastIntent"];
  quote?: Quote;
  appointment?: AppointmentRequest;
};
