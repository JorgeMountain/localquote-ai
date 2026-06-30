import OpenAI from "openai";
import type { Business, BusinessFaq, Conversation, Message } from "./types";

let openaiClient: OpenAI | null = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export function detectIntent(text: string): Conversation["lastIntent"] {
  const normalized = text.toLowerCase();
  if (/(agenda|agendar|cita|turno|horario|disponible)/.test(normalized)) return "appointment";
  if (/(cotiza|cotizacion|precio|cuanto|valor|cuesta|presupuesto)/.test(normalized)) return "quote";
  if (/(asesor|persona|confirmar|llamar)/.test(normalized)) return "handoff";
  return "faq";
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
  userMessage: string;
}) {
  const intent = detectIntent(input.userMessage);
  const client = getOpenAI();

  if (client) {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(input.business, input.faqs),
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
  }

  const faq = relevantFaqReply(input.userMessage, input.faqs);
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

function buildSystemPrompt(business: Business, faqs: BusinessFaq[]) {
  return [
    `Eres el asistente comercial de ${business.name}.`,
    `Descripcion: ${business.description}`,
    `Servicios: ${business.services.join(", ")}`,
    `Horarios: ${business.hours}`,
    `Ubicacion/cobertura: ${business.location}`,
    `Telefono: ${business.phone}`,
    `Reglas: ${business.rules.join(" | ")}`,
    `FAQs: ${faqs.map((faq) => `P: ${faq.question} R: ${faq.answer}`).join(" | ")}`,
    "Responde breve y profesionalmente.",
    "Usa solamente la informacion anterior. Si falta informacion, di que debe confirmarse con el negocio.",
    "Si detectas intencion de agendar o cotizar, pide los datos faltantes.",
  ].join("\n");
}
