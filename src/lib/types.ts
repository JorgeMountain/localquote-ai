export type BusinessType = "dentist" | "repair";

export type LeadStatus = "new" | "qualified" | "appointment" | "quoted";

export type AppointmentStatus = "pending" | "confirmed" | "cancelled";

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";

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
};

export type BusinessFaq = {
  id: string;
  businessId: string;
  question: string;
  answer: string;
  category?: string;
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
};

export type ChatRequest = {
  slug: string;
  customerName: string;
  customerPhone: string;
  message: string;
  conversationId?: string;
  customerId?: string;
};

export type ChatResponse = {
  conversationId: string;
  customerId: string;
  reply: string;
  intent: Conversation["lastIntent"];
  quote?: Quote;
  appointment?: AppointmentRequest;
};
