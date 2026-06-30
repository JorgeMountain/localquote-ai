import {
  appointmentRequests,
  businesses,
  conversations,
  customers,
  faqs,
  messages,
  quotes,
} from "./seed";
import type {
  AppointmentRequest,
  BusinessFaq,
  ChatRequest,
  Conversation,
  Customer,
  Message,
  Quote,
} from "./types";

const db = {
  businesses: [...businesses],
  faqs: [...faqs],
  customers: [...customers],
  conversations: [...conversations],
  messages: [...messages],
  appointmentRequests: [...appointmentRequests],
  quotes: [...quotes],
};

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export function getSnapshot() {
  return db;
}

export function getBusinessBySlug(slug: string) {
  return db.businesses.find((business) => business.slug === slug);
}

export function getBusinessFaqs(businessId: string): BusinessFaq[] {
  return db.faqs.filter((faq) => faq.businessId === businessId);
}

export function getCustomer(customerId: string) {
  return db.customers.find((customer) => customer.id === customerId);
}

export function getConversationMessages(conversationId: string): Message[] {
  return db.messages.filter((message) => message.conversationId === conversationId);
}

export function upsertCustomer(payload: Pick<ChatRequest, "customerName" | "customerPhone"> & { businessId: string }): Customer {
  const existing = db.customers.find(
    (customer) =>
      customer.businessId === payload.businessId &&
      customer.phone.replace(/\s/g, "") === payload.customerPhone.replace(/\s/g, ""),
  );

  if (existing) {
    existing.name = payload.customerName || existing.name;
    return existing;
  }

  const customer: Customer = {
    id: id("cus"),
    businessId: payload.businessId,
    name: payload.customerName,
    phone: payload.customerPhone,
    status: "new",
    createdAt: now(),
  };
  db.customers.unshift(customer);
  return customer;
}

export function startOrContinueConversation(input: {
  businessId: string;
  customerId: string;
  conversationId?: string;
}): Conversation {
  const existing =
    input.conversationId &&
    db.conversations.find((conversation) => conversation.id === input.conversationId);

  if (existing) {
    return existing;
  }

  const conversation: Conversation = {
    id: id("conv"),
    businessId: input.businessId,
    customerId: input.customerId,
    channel: "web",
    lastIntent: "faq",
    createdAt: now(),
  };
  db.conversations.unshift(conversation);
  return conversation;
}

export function addMessage(input: Omit<Message, "id" | "createdAt">) {
  const message: Message = {
    ...input,
    id: id("msg"),
    createdAt: now(),
  };
  db.messages.push(message);
  return message;
}

export function setConversationIntent(conversationId: string, intent: Conversation["lastIntent"]) {
  const conversation = db.conversations.find((item) => item.id === conversationId);
  if (conversation) {
    conversation.lastIntent = intent;
  }
}

export function createAppointment(input: Omit<AppointmentRequest, "id" | "status">) {
  const appointment: AppointmentRequest = {
    ...input,
    id: id("appt"),
    status: "pending",
  };
  db.appointmentRequests.unshift(appointment);
  const customer = getCustomer(input.customerId);
  if (customer) customer.status = "appointment";
  return appointment;
}

export function createQuote(input: Omit<Quote, "id" | "status">) {
  const quote: Quote = {
    ...input,
    id: id("quote"),
    status: "draft",
  };
  db.quotes.unshift(quote);
  const customer = getCustomer(input.customerId);
  if (customer) customer.status = "quoted";
  return quote;
}
