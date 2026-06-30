import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { shortDate } from "@/lib/format";
import { getCustomer, getConversationMessages, getSnapshot } from "@/lib/store";

export default function ConversationsPage() {
  const data = getSnapshot();

  return (
    <AppShell>
      <header className="mb-6 border-b border-black/10 pb-6">
        <h1 className="text-4xl font-semibold tracking-normal">Conversaciones</h1>
        <p className="mt-2 text-[#706d62]">Mensajes por cliente, negocio e intencion detectada.</p>
      </header>

      <div className="grid gap-4">
        {data.conversations.map((conversation) => {
          const customer = getCustomer(conversation.customerId);
          const business = data.businesses.find((item) => item.id === conversation.businessId);
          const thread = getConversationMessages(conversation.id);
          return (
            <article key={conversation.id} className="rounded-md border border-black/10 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{customer?.name}</h2>
                  <p className="text-sm text-[#706d62]">
                    {business?.name} - {customer?.phone} - {shortDate(conversation.createdAt)}
                  </p>
                </div>
                <StatusBadge value={conversation.lastIntent} />
              </div>
              <div className="mt-4 grid gap-2">
                {thread.map((message) => (
                  <p key={message.id} className="rounded-md bg-[#f8f6f1] px-3 py-2 text-sm">
                    <strong>{message.role === "assistant" ? "AI" : "Cliente"}:</strong> {message.body}
                  </p>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
