import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AppointmentStatusForm,
  CustomerStatusForm,
  QuickAppointmentButton,
  QuickQuoteAcceptedButton,
  QuickQuoteSentButton,
  QuoteStatusForm,
} from "@/components/ActionForms";
import { AppShell } from "@/components/AppShell";
import { BusinessFilter } from "@/components/BusinessFilter";
import {
  ConversationMetaEditor,
  ManualReplyComposer,
  MarkConversationReadButton,
} from "@/components/ConversationWorkspaceActions";
import { OnboardingPanel } from "@/components/OnboardingPanel";
import { ListToolbar } from "@/components/ListToolbar";
import { StatusBadge } from "@/components/StatusBadge";
import { currencyCop, shortDate } from "@/lib/format";
import { getConversationsPageData } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { Conversation } from "@/lib/types";

type ConversationsPageProps = {
  searchParams?: Promise<{ business?: string; conversation?: string; q?: string; page?: string }>;
};

export default async function ConversationsPage({ searchParams }: ConversationsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const data = await getConversationsPageData(supabase, user.id, {
    businessId: params?.business,
    conversationId: params?.conversation,
    search: params?.q,
    page: Number(params?.page),
  });
  const activeBusinessId = data.activeBusinessId;
  const conversations = data.conversations;
  const selectedConversation = data.selectedConversation;
  const selectedCustomer = data.selectedCustomer;
  const customerById = new Map(data.customers.map((customer) => [customer.id, customer]));
  const businessById = new Map(data.businesses.map((business) => [business.id, business]));
  const selectedBusiness = selectedConversation
    ? businessById.get(selectedConversation.businessId)
    : undefined;
  const selectedMessages = data.messages;
  const relatedAppointments = data.appointmentRequests;
  const relatedQuotes = data.quotes;

  return (
    <AppShell viewerProfile={data.viewerProfile}>
      <header className="mb-6 border-b border-black/10 pb-6">
        <h1 className="text-4xl font-semibold tracking-normal">Conversaciones</h1>
        <p className="mt-2 text-[#706d62]">Detalle de lead, mensajes y siguientes acciones comerciales.</p>
      </header>

      {data.businesses.length === 0 ? (
        <OnboardingPanel userEmail={user.email} />
      ) : (
        <div className="grid gap-6">
          <BusinessFilter businesses={data.businesses} activeBusinessId={activeBusinessId} basePath="/conversations" />
          <ListToolbar
            basePath="/conversations"
            businessId={activeBusinessId}
            search={params?.q}
            page={data.page}
            totalPages={data.totalPages}
          />

          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <section className="rounded-md border border-black/10 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Leads</h2>
                <span className="text-sm text-[#706d62]">{conversations.length} conversaciones</span>
              </div>

              <div className="mt-4 grid gap-3">
                {conversations.map((conversation) => {
                  const customer = customerById.get(conversation.customerId);
                  const business = businessById.get(conversation.businessId);
                  const conversationParams = new URLSearchParams({
                    business: conversation.businessId,
                    conversation: conversation.id,
                  });
                  if (params?.q) conversationParams.set("q", params.q);
                  if (data.page > 1) conversationParams.set("page", String(data.page));
                  const href = `/conversations?${conversationParams.toString()}`;
                  const active = conversation.id === selectedConversation?.id;
                  const unread = isUnreadConversation(conversation);

                  return (
                    <Link
                      key={conversation.id}
                      href={href}
                      className={`rounded-md border p-4 transition ${
                        active ? "border-black bg-[#f8f6f1]" : "border-black/10 hover:border-black/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{customer?.name ?? "Cliente sin nombre"}</p>
                          <p className="mt-1 text-sm text-[#706d62]">{business?.name}</p>
                        </div>
                        <div className="grid justify-items-end gap-2">
                          {unread && <span className="rounded-full bg-[#e2f26b] px-2 py-1 text-xs font-semibold text-black">Nuevo</span>}
                          <StatusBadge value={conversation.lastIntent} />
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-[#706d62]">
                        {customer?.phone} - Ultimo mensaje {shortDate(conversation.lastMessageAt)}
                      </p>
                      {conversation.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {conversation.tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-[#706d62]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  );
                })}

                {conversations.length === 0 && (
                  <p className="rounded-md border border-dashed border-black/15 p-4 text-sm text-[#706d62]">
                    Sin conversaciones para este negocio.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-md border border-black/10 bg-white p-5">
              {selectedConversation && selectedCustomer && selectedBusiness ? (
                <div className="grid gap-6">
                  <div className="flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#706d62]">
                        {selectedBusiness.name}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold">{selectedCustomer.name}</h2>
                      <p className="mt-1 text-sm text-[#706d62]">
                        {selectedCustomer.phone} - {shortDate(selectedCustomer.createdAt)}
                      </p>
                    </div>
                    <div className="grid gap-2 lg:justify-items-end">
                      <StatusBadge value={selectedConversation.lastIntent} />
                      <CustomerStatusForm id={selectedCustomer.id} status={selectedCustomer.status} />
                      {isUnreadConversation(selectedConversation) && (
                        <MarkConversationReadButton conversationId={selectedConversation.id} />
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <h3 className="text-lg font-semibold">Historial</h3>
                    {selectedMessages.map((message) => (
                      <p
                        key={message.id}
                        className={`rounded-md px-3 py-2 text-sm leading-6 ${
                          message.role === "assistant" ? "bg-[#111111] text-white" : "bg-[#f8f6f1]"
                        }`}
                      >
                        <strong>{message.role === "assistant" ? "AI" : "Cliente"}:</strong> {message.body}
                        <span className="mt-1 block text-xs opacity-65">
                          {new Date(message.createdAt).toLocaleString("es-CO")}
                        </span>
                      </p>
                    ))}
                    {selectedMessages.length === 0 && (
                      <p className="rounded-md border border-dashed border-black/15 p-4 text-sm text-[#706d62]">
                        Esta conversacion aun no tiene mensajes guardados.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <ConversationMetaEditor
                      conversationId={selectedConversation.id}
                      internalNotes={selectedConversation.internalNotes}
                      tags={selectedConversation.tags}
                    />
                    <ManualReplyComposer conversationId={selectedConversation.id} channel={selectedConversation.channel} />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-md border border-black/10 bg-[#f8f6f1] p-4">
                      <h3 className="font-semibold">Citas</h3>
                      <div className="mt-3 grid gap-3">
                        {relatedAppointments.map((appointment) => (
                          <article key={appointment.id} className="rounded-md bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">{appointment.service}</p>
                                <p className="text-sm text-[#706d62]">
                                  {appointment.preferredDate} - {appointment.preferredTime}
                                </p>
                              </div>
                              <StatusBadge value={appointment.status} />
                            </div>
                            <div className="mt-3 grid gap-3">
                              <AppointmentStatusForm id={appointment.id} status={appointment.status} />
                              {appointment.status !== "confirmed" && <QuickAppointmentButton id={appointment.id} />}
                            </div>
                          </article>
                        ))}
                        {relatedAppointments.length === 0 && (
                          <p className="text-sm text-[#706d62]">Este lead aun no tiene cita.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-md border border-black/10 bg-[#f8f6f1] p-4">
                      <h3 className="font-semibold">Cotizaciones</h3>
                      <div className="mt-3 grid gap-3">
                        {relatedQuotes.map((quote) => (
                          <article key={quote.id} className="rounded-md bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">{quote.service}</p>
                                <p className="text-sm text-[#706d62]">
                                  {currencyCop(quote.minPrice)} - {currencyCop(quote.maxPrice)}
                                </p>
                              </div>
                              <StatusBadge value={quote.status} />
                            </div>
                            <p className="mt-2 text-sm text-[#706d62]">{quote.description}</p>
                            <div className="mt-3 grid gap-3">
                              <QuoteStatusForm id={quote.id} status={quote.status} />
                              <div className="flex flex-wrap gap-2">
                                {quote.status !== "sent" && <QuickQuoteSentButton id={quote.id} />}
                                {quote.status !== "accepted" && <QuickQuoteAcceptedButton id={quote.id} />}
                              </div>
                            </div>
                          </article>
                        ))}
                        {relatedQuotes.length === 0 && (
                          <p className="text-sm text-[#706d62]">Este lead aun no tiene cotizacion.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#706d62]">Selecciona una conversacion para ver el detalle.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function isUnreadConversation(conversation: Conversation) {
  if (!conversation.lastReadAt) return true;
  return new Date(conversation.lastMessageAt).getTime() > new Date(conversation.lastReadAt).getTime();
}
