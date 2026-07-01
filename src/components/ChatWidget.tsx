"use client";

import { SendHorizontal, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Business, ChatResponse } from "@/lib/types";
import { currencyCop } from "@/lib/format";

type UiMessage = {
  role: "assistant" | "customer";
  body: string;
};

export function ChatWidget({ business }: { business: Business }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [customerId, setCustomerId] = useState<string>();
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      role: "assistant",
      body: `Hola, soy el asistente de ${business.name}. Dejame tu nombre, telefono y pregunta para ayudarte.`,
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim() || !customerName.trim() || !customerPhone.trim()) return;

    const customerMessage = message.trim();
    setMessages((current) => [...current, { role: "customer", body: customerMessage }]);
    setMessage("");
    setIsSending(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: business.slug,
        customerName,
        customerPhone,
        message: customerMessage,
        conversationId,
        customerId,
      }),
    });

    const data = (await response.json()) as ChatResponse & { error?: string };
    if (!response.ok) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          body: data.error ?? "No pude guardar el mensaje. Intentalo de nuevo.",
        },
      ]);
      setIsSending(false);
      return;
    }

    setConversationId(data.conversationId);
    setCustomerId(data.customerId);
    setLastResponse(data);
    setMessages((current) => [...current, { role: "assistant", body: data.reply }]);
    setIsSending(false);
  }

  return (
    <section className="grid min-h-screen bg-[#111111] text-white lg:grid-cols-[0.95fr_1.05fr]">
      <div className="flex flex-col justify-between border-r border-white/10 p-6 sm:p-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-sm bg-[#e2f26b] px-3 py-1 text-sm font-semibold text-black">
            <Sparkles size={15} />
            Asistente comercial
          </div>
          <h1 className="mt-8 max-w-xl text-4xl font-semibold tracking-normal sm:text-6xl">
            {business.name}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">{business.description}</p>
        </div>

        <div className="mt-10 grid gap-4 text-sm text-white/70 sm:grid-cols-2">
          <div>
            <p className="font-semibold text-white">Servicios</p>
            <p>{business.services.join(", ")}</p>
          </div>
          <div>
            <p className="font-semibold text-white">Horario</p>
            <p>{business.hours}</p>
          </div>
          <div>
            <p className="font-semibold text-white">Zona</p>
            <p>{business.location}</p>
          </div>
          <div>
            <p className="font-semibold text-white">Contacto</p>
            <p>{business.phone}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl rounded-md border border-white/10 bg-[#f8f6f1] text-[#171717] shadow-2xl">
          <div className="border-b border-black/10 p-4">
            <p className="text-sm font-semibold">Chat web tipo WhatsApp</p>
            <p className="text-xs text-[#706d62]">
              Las respuestas no inventan datos; si falta informacion, escalan a confirmacion.
            </p>
          </div>

          <div className="grid gap-3 border-b border-black/10 p-4 sm:grid-cols-2">
            <input
              className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm outline-none focus:border-black"
              placeholder="Nombre del cliente"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
            <input
              className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm outline-none focus:border-black"
              placeholder="Telefono o WhatsApp"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
            />
          </div>

          <div className="h-[420px] space-y-3 overflow-y-auto p-4">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`max-w-[82%] rounded-md px-4 py-3 text-sm leading-6 ${
                  item.role === "customer"
                    ? "ml-auto bg-[#d7eb4c]"
                    : "mr-auto border border-black/10 bg-white"
                }`}
              >
                {item.body}
              </div>
            ))}
            {isSending && (
              <div className="mr-auto max-w-[82%] rounded-md border border-black/10 bg-white px-4 py-3 text-sm">
                Escribiendo...
              </div>
            )}
          </div>

          {lastResponse?.quote && (
            <div className="mx-4 mb-3 rounded-md border border-black/10 bg-white p-3 text-sm">
              Cotizacion estimada: {currencyCop(lastResponse.quote.minPrice)} -{" "}
              {currencyCop(lastResponse.quote.maxPrice)}. Requiere confirmacion.
            </div>
          )}

          <form onSubmit={submit} className="flex gap-2 border-t border-black/10 p-4">
            <input
              className="h-12 flex-1 rounded-md border border-black/15 bg-white px-3 text-sm outline-none focus:border-black"
              placeholder="Escribe una pregunta, cita o cotizacion..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <button
              className="flex size-12 shrink-0 items-center justify-center rounded-md bg-black text-white transition hover:bg-[#2b2b2b] disabled:opacity-50"
              disabled={isSending}
              aria-label="Enviar"
            >
              <SendHorizontal size={18} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
