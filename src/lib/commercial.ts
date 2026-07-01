import type { AppointmentRequest, Business, Conversation, Quote } from "./types";

export type CommercialAnalysis = {
  intent: Conversation["lastIntent"];
  missingFields: string[];
  appointmentDraft?: Omit<AppointmentRequest, "id" | "businessId" | "customerId" | "status">;
  quoteDraft?: Omit<Quote, "id" | "businessId" | "customerId" | "status">;
};

const appointmentWords = [
  "agenda",
  "agendar",
  "cita",
  "turno",
  "reservar",
  "disponible",
  "horario",
  "manana",
  "mañana",
  "hoy",
  "lunes",
  "martes",
  "miercoles",
  "miércoles",
  "jueves",
  "viernes",
  "sabado",
  "sábado",
];

const quoteWords = [
  "cotiza",
  "cotizacion",
  "cotización",
  "precio",
  "cuanto",
  "cuánto",
  "valor",
  "cuesta",
  "presupuesto",
  "estimado",
];

const handoffWords = ["asesor", "persona", "llamar", "whatsapp", "confirmar", "humano"];

export function analyzeCommercialRequest(message: string, business: Business): CommercialAnalysis {
  const normalized = normalize(message);
  const intent = detectCommercialIntent(normalized);
  const service = detectService(normalized, business.services);

  if (intent === "appointment") {
    const preferredDate = detectDate(normalized);
    const preferredTime = detectTime(normalized);
    const missingFields = [
      !service ? "servicio" : "",
      !preferredDate ? "fecha preferida" : "",
      !preferredTime ? "hora preferida" : "",
    ].filter(Boolean);

    return {
      intent,
      missingFields,
      appointmentDraft:
        missingFields.length === 0
          ? {
              service: service!,
              preferredDate: preferredDate!,
              preferredTime: preferredTime!,
            }
          : undefined,
    };
  }

  if (intent === "quote") {
    const hasProblemDetail = normalized.split(/\s+/).filter(Boolean).length >= 7;
    const missingFields = [!service ? "servicio" : "", !hasProblemDetail ? "descripcion del caso" : ""].filter(
      Boolean,
    );
    const [minPrice, maxPrice] = estimatePriceRange(business, service);

    return {
      intent,
      missingFields,
      quoteDraft:
        missingFields.length === 0
          ? {
              service: service!,
              description: message,
              minPrice,
              maxPrice,
              notes: "Cotizacion estimada generada por IA. Requiere confirmacion del negocio.",
            }
          : undefined,
    };
  }

  return { intent, missingFields: [] };
}

export function buildCommercialReply(baseReply: string, analysis: CommercialAnalysis) {
  if (analysis.appointmentDraft) {
    return `${baseReply} Deje registrada la solicitud de cita como pendiente para confirmacion del negocio.`;
  }

  if (analysis.quoteDraft) {
    return `${baseReply} Deje una cotizacion estimada en borrador para que el negocio la revise antes de enviarla.`;
  }

  if ((analysis.intent === "appointment" || analysis.intent === "quote") && analysis.missingFields.length > 0) {
    return `Para ${analysis.intent === "appointment" ? "crear la solicitud de cita" : "generar la cotizacion estimada"} necesito: ${analysis.missingFields.join(", ")}. No voy a inventar esos datos; enviamelos y lo registro.`;
  }

  return baseReply;
}

function detectCommercialIntent(normalized: string): Conversation["lastIntent"] {
  const scoreAppointment = appointmentWords.filter((word) => normalized.includes(word)).length;
  const scoreQuote = quoteWords.filter((word) => normalized.includes(word)).length;
  const scoreHandoff = handoffWords.filter((word) => normalized.includes(word)).length;

  if (scoreHandoff > 0 && scoreAppointment === 0 && scoreQuote === 0) return "handoff";
  if (scoreAppointment > scoreQuote) return "appointment";
  if (scoreQuote > 0) return "quote";
  if (scoreAppointment > 0) return "appointment";
  return "faq";
}

function detectService(normalized: string, services: string[]) {
  const directMatch = services.find((service) => {
    const serviceWords = normalize(service)
      .split(/\s+/)
      .filter((word) => word.length > 3);
    return serviceWords.some((word) => normalized.includes(word));
  });

  if (directMatch) return directMatch;

  const synonymMap = [
    { match: ["reparar", "arreglar", "dano", "daño", "falla"], target: "reparacion" },
    { match: ["revision", "revisar", "diagnostico", "diagnosticar"], target: "diagnostico" },
    { match: ["instalar", "instalacion"], target: "instalacion" },
    { match: ["visita", "domicilio"], target: "visita" },
    { match: ["limpieza"], target: "limpieza" },
    { match: ["blanqueamiento", "blanquear"], target: "blanqueamiento" },
    { match: ["ortodoncia", "brackets"], target: "ortodoncia" },
    { match: ["consulta", "valoracion", "valoracion"], target: "consulta" },
  ];

  const synonym = synonymMap.find((entry) => entry.match.some((word) => normalized.includes(normalize(word))));
  if (!synonym) return undefined;

  return services.find((service) => normalize(service).includes(synonym.target));
}

function detectDate(normalized: string) {
  const isoMatch = normalized.match(/\b20\d{2}-\d{2}-\d{2}\b/);
  if (isoMatch) return isoMatch[0];

  const slashMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3] ? normalizeYear(slashMatch[3]) : String(new Date().getFullYear());
    return `${year}-${month}-${day}`;
  }

  if (normalized.includes("manana") || normalized.includes("mañana")) {
    return daysFromNow(1);
  }

  if (normalized.includes("hoy")) {
    return daysFromNow(0);
  }

  const weekdayOffset = nextWeekdayOffset(normalized);
  if (weekdayOffset !== null) return daysFromNow(weekdayOffset);

  return null;
}

function detectTime(normalized: string) {
  const contextualMatch = normalized.match(
    /\b(?:a las|a la|sobre las|hora|horario)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/,
  );
  const explicitMatch = normalized.match(/\b(\d{1,2})(?::(\d{2}))\s*(am|pm|a\.m\.|p\.m\.)?\b/);
  const meridiemMatch = normalized.match(/\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/);
  const match = contextualMatch ?? explicitMatch ?? meridiemMatch;
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2] ?? "00";
  const meridiem = match[3]?.replace(/\./g, "");

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (hours > 23) return null;

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function estimatePriceRange(business: Business, service?: string): [number, number] {
  const normalizedService = normalize(service ?? "");

  if (business.type === "dentist") {
    if (normalizedService.includes("limpieza")) return [120000, 180000];
    if (normalizedService.includes("blanqueamiento")) return [450000, 900000];
    if (normalizedService.includes("ortodoncia")) return [0, 0];
    return [120000, 250000];
  }

  if (normalizedService.includes("visita") || normalizedService.includes("diagnostico")) return [80000, 140000];
  if (normalizedService.includes("instalacion")) return [120000, 320000];
  return [80000, 220000];
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeYear(value: string) {
  if (value.length === 2) return `20${value}`;
  return value;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextWeekdayOffset(normalized: string) {
  const weekdays = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const target = weekdays.findIndex((weekday) => normalized.includes(weekday));
  if (target === -1) return null;

  const today = new Date().getDay();
  const offset = (target - today + 7) % 7;
  return offset === 0 ? 7 : offset;
}
