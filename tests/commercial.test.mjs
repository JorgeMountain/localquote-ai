import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCommercialRequest } from "../src/lib/commercial.ts";

const business = {
  id: "business",
  ownerId: "owner",
  name: "Negocio de prueba",
  slug: "negocio-prueba",
  type: "dentist",
  description: "",
  services: ["Blanqueamiento dental", "Consulta inicial"],
  hours: "",
  location: "",
  phone: "",
  rules: [],
};

test("rechaza fechas inexistentes", () => {
  const analysis = analyzeCommercialRequest(
    "Quiero agendar blanqueamiento dental el 31/02/2027 a las 10:00",
    business,
  );

  assert.equal(analysis.appointmentDraft, undefined);
  assert.ok(analysis.missingFields.includes("fecha preferida"));
});

test("rechaza horas invalidas", () => {
  const analysis = analyzeCommercialRequest(
    "Quiero agendar blanqueamiento dental el 10/07/2027 a las 10:99",
    business,
  );

  assert.equal(analysis.appointmentDraft, undefined);
  assert.ok(analysis.missingFields.includes("hora preferida"));
});

test("rechaza fechas pasadas explicitas", () => {
  const analysis = analyzeCommercialRequest(
    "Quiero agendar blanqueamiento dental el 10/07/2020 a las 10:00",
    business,
  );

  assert.equal(analysis.appointmentDraft, undefined);
  assert.ok(analysis.missingFields.includes("fecha preferida"));
});

test("rechaza una hora pasada del dia actual", () => {
  const today = dateInBogota();
  const analysis = analyzeCommercialRequest(
    `Quiero agendar blanqueamiento dental el ${today} a las 00:00`,
    business,
  );

  assert.equal(analysis.appointmentDraft, undefined);
  assert.ok(analysis.missingFields.includes("hora preferida"));
});

test("crea borrador con servicio, fecha y hora futuros", () => {
  const future = daysFromNowInBogota(30);
  const analysis = analyzeCommercialRequest(
    `Quiero agendar blanqueamiento dental el ${future} a las 10:30`,
    business,
  );

  assert.deepEqual(analysis.appointmentDraft, {
    service: "Blanqueamiento dental",
    preferredDate: future,
    preferredTime: "10:30",
  });
});

test("usa el precio estructurado configurado para una cotizacion", () => {
  const analysis = analyzeCommercialRequest(
    "Quiero cotizar blanqueamiento dental para corregir varias manchas visibles",
    {
      ...business,
      structuredServices: [
        {
          id: "service",
          businessId: business.id,
          name: "Blanqueamiento dental",
          description: "Precio aprobado",
          minPrice: 450000,
          maxPrice: 600000,
          requiresEvaluation: true,
          isActive: true,
        },
      ],
    },
  );

  assert.equal(analysis.quoteDraft?.minPrice, 450000);
  assert.equal(analysis.quoteDraft?.maxPrice, 600000);
});

test("no inventa un rango cuando el negocio no configuro precio", () => {
  const analysis = analyzeCommercialRequest(
    "Quiero cotizar blanqueamiento dental para corregir varias manchas visibles",
    business,
  );

  assert.equal(analysis.quoteDraft?.minPrice, 0);
  assert.equal(analysis.quoteDraft?.maxPrice, 0);
  assert.match(analysis.quoteDraft?.notes ?? "", /Precio no configurado/);
});

function dateInBogota() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

function daysFromNowInBogota(days) {
  const [year, month, day] = dateInBogota().split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function part(parts, type) {
  return parts.find((item) => item.type === type)?.value;
}
