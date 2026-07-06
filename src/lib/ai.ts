import OpenAI from "openai";
import { analyzeCommercialRequest } from "./commercial";
import type { Business, BusinessFaq, Conversation, Message } from "./types";

type AiProvider = "deepseek" | "openai" | "none";

type AiClientConfig = {
  client: OpenAI;
  model: string;
  provider: Exclude<AiProvider, "none">;
};

const clients: Partial<Record<Exclude<AiProvider, "none">, OpenAI>> = {};

function getAiProvider(): AiProvider {
  const configuredProvider = process.env.AI_PROVIDER?.toLowerCase();

  if (configuredProvider === "deepseek" || configuredProvider === "openai" || configuredProvider === "none") {
    return configuredProvider;
  }

  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

function getAiClient(): AiClientConfig | null {
  const provider = getAiProvider();

  if (provider === "deepseek") {
    if (!process.env.DEEPSEEK_API_KEY) return null;

    const client =
      clients.deepseek ??
      (clients.deepseek = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
      }));

    return {
      client,
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
      provider,
    };
  }

  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) return null;

    const client = clients.openai ?? (clients.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

    return {
      client,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      provider,
    };
  }

  return null;
}

export function detectIntent(text: string): Conversation["lastIntent"] {
  return analyzeCommercialRequest(text, {
    id: "intent-only",
    ownerId: "intent-only",
    name: "Negocio",
    slug: "negocio",
    type: "repair",
    description: "",
    services: [],
    hours: "",
    location: "",
    phone: "",
    rules: [],
  }).intent;
}

function relevantFaqReply(text: string, faqs: BusinessFaq[]) {
  const tokens = text
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 3);

  return faqs.find((faq) => {
    const searchable = `${faq.question} ${faq.answer}`.toLowerCase();
    return tokens.some((token) => searchable.includes(token));
  });
}

export async function generateAssistantReply(input: {
  business: Business;
  faqs: BusinessFaq[];
  history: Message[];
  customerName?: string;
  customerPhone?: string;
  userMessage: string;
}) {
  const intent = analyzeCommercialRequest(input.userMessage, input.business).intent;
  const ai = getAiClient();

  if (ai) {
    try {
      const completion = await ai.client.chat.completions.create({
        model: ai.model,
        temperature: 0.2,
        stream: false,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(input.business, input.faqs, {
              customerName: input.customerName,
              customerPhone: input.customerPhone,
            }),
          },
          ...input.history.slice(-8).map((message) => ({
            role: message.role === "assistant" ? "assistant" as const : "user" as const,
            content: message.body,
          })),
          { role: "user", content: input.userMessage },
        ],
      });

      return {
        intent,
        reply:
          completion.choices[0]?.message.content ??
          "Necesito confirmar esa informacion con el negocio antes de responderte.",
      };
    } catch (error) {
      console.error("AI provider request failed. Using deterministic fallback.", error);
    }
  }

  return generateFallbackReply(input.userMessage, input.faqs, intent);
}

function generateFallbackReply(userMessage: string, faqs: BusinessFaq[], intent: Conversation["lastIntent"]) {
  const faq = relevantFaqReply(userMessage, faqs);
  if (faq) {
    return { intent, reply: `${faq.answer} Deseas que deje una solicitud para que el equipo te confirme?` };
  }

  if (intent === "appointment") {
    return {
      intent,
      reply:
        "Puedo tomar tu solicitud de cita. Indica servicio, fecha y hora preferida; el negocio debe confirmar disponibilidad antes de dejarla fija.",
    };
  }

  if (intent === "quote") {
    return {
      intent,
      reply:
        "Puedo generar una cotizacion estimada con la informacion disponible. Para no inventar datos, necesito el servicio y una breve descripcion del caso.",
    };
  }

  return {
    intent,
    reply:
      "No tengo informacion suficiente para responder con precision. Puedo dejar tu solicitud para que el negocio la confirme directamente.",
  };
}

function buildSystemPrompt(
  business: Business,
  faqs: BusinessFaq[],
  customer?: { customerName?: string; customerPhone?: string },
) {
  return [
    `Eres el asistente comercial de ${business.name}.`,
    customer?.customerName ? `Cliente: ${customer.customerName}` : "",
    customer?.customerPhone ? `Telefono del cliente: ${customer.customerPhone}` : "",
    `Descripcion: ${business.description}`,
    `Servicios: ${business.services.join(", ")}`,
    `Horarios: ${business.hours}`,
    `Ubicacion/cobertura: ${business.location}`,
    `Telefono: ${business.phone}`,
    `Reglas: ${business.rules.join(" | ")}`,
    `FAQs: ${faqs.map((faq) => `P: ${faq.question} R: ${faq.answer}`).join(" | ")}`,
    "Responde breve y profesionalmente.",
    "Usa solamente la informacion anterior. Si falta informacion, di que debe confirmarse con el negocio.",
    "No vuelvas a pedir nombre o telefono si ya aparecen como Cliente o Telefono del cliente.",
    "Ten en cuenta el historial reciente antes de pedir datos faltantes.",
    "Si detectas intencion de agendar o cotizar, pide los datos faltantes.",
  ].filter(Boolean).join("\n");
}
