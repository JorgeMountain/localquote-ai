import type { AppointmentRequest, Business, Conversation, Quote } from "./types";

export type CommercialAnalysis = {
  intent: Conversation["lastIntent"];
  missingFields: string[];
  appointmentDraft?: Pick<AppointmentRequest, "service" | "preferredDate" | "preferredTime">;
  quoteDraft?: Pick<Quote, "service" | "description" | "minPrice" | "maxPrice" | "notes">;
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
  "agendame",
  "agendarme",
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
  const structuredServiceNames = (business.structuredServices ?? [])
    .filter((service) => service.isActive)
    .map((service) => service.name);
  const service = detectService(normalized, structuredServiceNames.length > 0 ? structuredServiceNames : business.services);

  if (intent === "appointment") {
    const preferredDate = detectDate(normalized);
    const detectedTime = detectTime(normalized);
    const preferredTime =
      preferredDate && detectedTime && !isFutureAppointmentTime(preferredDate, detectedTime)
        ? null
        : detectedTime;
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
              notes:
                minPrice === 0 && maxPrice === 0
                  ? "Precio no configurado. Requiere confirmacion del negocio."
                  : "Cotizacion basada en los precios configurados. Requiere confirmacion del negocio.",
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
  const exactMatch = services.find((service) => normalized.includes(normalize(service)));
  if (exactMatch) return exactMatch;

  const scoredMatch = services
    .map((service) => {
      const serviceWords = normalize(service)
        .split(/\s+/)
        .filter((word) => word.length > 3 && !["dental", "tecnica", "tecnico"].includes(word));
      const score = serviceWords.filter((word) => normalized.includes(word)).length;
      return { service, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)[0];

  if (scoredMatch) return scoredMatch.service;

  const synonymMap = [
    { match: ["reparar", "arreglar", "dano", "daño", "falla"], target: "reparacion" },
    { match: ["revision", "revisar", "diagnostico", "diagnosticar"], target: "diagnostico" },
    { match: ["instalar", "instalacion"], target: "instalacion" },
    { match: ["visita", "domicilio"], target: "visita" },
    { match: ["limpieza"], target: "limpieza" },
    { match: ["blanqueamiento", "blanquear", "blanqueamineto"], target: "blanqueamiento" },
    { match: ["ortodoncia", "brackets"], target: "ortodoncia" },
    { match: ["consulta", "valoracion", "valoracion"], target: "consulta" },
  ];

  const synonym = synonymMap.find((entry) => entry.match.some((word) => normalized.includes(normalize(word))));
  if (!synonym) return undefined;

  return services.find((service) => normalize(service).includes(synonym.target));
}

function detectDate(normalized: string) {
  const isoMatch = normalized.match(/\b20\d{2}-\d{2}-\d{2}\b/);
  if (isoMatch) return isValidFutureDate(isoMatch[0]) ? isoMatch[0] : null;

  const slashMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const explicitYear = slashMatch[3] ? normalizeYear(slashMatch[3]) : null;
    let year = explicitYear ?? String(businessDateParts().year);
    let value = `${year}-${month}-${day}`;
    if (!explicitYear && isRealDate(value) && value < todayInBusinessTimeZone()) {
      year = String(Number(year) + 1);
      value = `${year}-${month}-${day}`;
    }
    return isValidFutureDate(value) ? value : null;
  }

  const textDateMatch = normalized.match(
    /\b(\d{1,2})\s*(?:de)?\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/,
  );
  if (textDateMatch) {
    return dateFromDayAndMonth(Number(textDateMatch[1]), textDateMatch[2]);
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
    /\b(?:a\s*las|alas|a la|sobre las|hora|horario)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/,
  );
  const explicitMatch = normalized.match(/\b(\d{1,2})(?::(\d{2}))\s*(am|pm|a\.m\.|p\.m\.)?\b/);
  const meridiemMatch = normalized.match(/\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/);
  const match = contextualMatch ?? explicitMatch ?? meridiemMatch;
  if (!match) return null;

  let hours = Number(match[1]);
  const minuteNumber = Number(match[2] ?? "00");
  const meridiem = match[3]?.replace(/\./g, "");

  if (minuteNumber > 59) return null;
  if (meridiem && (hours < 1 || hours > 12)) return null;
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (hours > 23) return null;

  return `${String(hours).padStart(2, "0")}:${String(minuteNumber).padStart(2, "0")}`;
}

function estimatePriceRange(business: Business, service?: string): [number, number] {
  const structuredService = business.structuredServices?.find(
    (candidate) => candidate.isActive && normalize(candidate.name) === normalize(service ?? ""),
  );
  if (structuredService?.minPrice !== undefined) {
    return [structuredService.minPrice, structuredService.maxPrice ?? structuredService.minPrice];
  }

  const explicitRange = extractPriceRange(service ?? "");
  if (explicitRange) return explicitRange;
  return [0, 0];
}

function extractPriceRange(value: string): [number, number] | null {
  const prices = value
    .match(/\$?\s*\d[\d.,]*/g)
    ?.map((price) => Number(price.replace(/[^\d]/g, "")))
    .filter((price) => Number.isFinite(price) && price > 0)
    .slice(0, 2);

  if (!prices || prices.length === 0) return null;
  if (prices.length === 1) return [prices[0], prices[0]];
  return [Math.min(prices[0], prices[1]), Math.max(prices[0], prices[1])];
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

function dateFromDayAndMonth(day: number, monthName: string) {
  const months: Record<string, number> = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    setiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  };
  const month = months[monthName];
  if (!month || day < 1 || day > 31) return null;

  let year = businessDateParts().year;
  let value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!isRealDate(value)) return null;
  if (value < todayInBusinessTimeZone()) {
    year += 1;
    value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return isRealDate(value) ? value : null;
}

function daysFromNow(days: number) {
  const today = businessDateParts();
  const date = new Date(Date.UTC(today.year, today.month - 1, today.day + days));
  return date.toISOString().slice(0, 10);
}

function nextWeekdayOffset(normalized: string) {
  const weekdays = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const target = weekdays.findIndex((weekday) => normalized.includes(weekday));
  if (target === -1) return null;

  const todayParts = businessDateParts();
  const today = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day)).getUTCDay();
  const offset = (target - today + 7) % 7;
  return offset === 0 ? 7 : offset;
}

function isValidFutureDate(value: string) {
  return isRealDate(value) && value >= todayInBusinessTimeZone();
}

function isRealDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function todayInBusinessTimeZone() {
  const parts = businessDateParts();
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function businessDateParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.BUSINESS_TIME_ZONE ?? "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function isFutureAppointmentTime(date: string, time: string) {
  if (date > todayInBusinessTimeZone()) return true;
  if (date < todayInBusinessTimeZone()) return false;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.BUSINESS_TIME_ZONE ?? "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date());
  const currentHour = Number(parts.find((part) => part.type === "hour")?.value);
  const currentMinute = Number(parts.find((part) => part.type === "minute")?.value);
  const [appointmentHour, appointmentMinute] = time.split(":").map(Number);

  return appointmentHour * 60 + appointmentMinute > currentHour * 60 + currentMinute;
}
