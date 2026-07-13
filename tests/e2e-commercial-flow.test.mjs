import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCommercialRequest } from "../src/lib/commercial.ts";
import { buildAppointmentConfirmationCopy } from "../src/lib/customer-notification-copy.ts";
import { validateAppointmentAvailability } from "../src/lib/schedule.ts";

test("flujo comercial: negocio, servicio, chat, cita pendiente y confirmacion", () => {
  const preferredDate = "2027-08-20";
  const business = {
    id: "business-e2e",
    ownerId: "owner-e2e",
    name: "Clinica E2E",
    slug: "clinica-e2e",
    type: "dentist",
    description: "Odontologia general.",
    services: ["Limpieza dental"],
    hours: "Lunes a viernes de 8:00 a.m. a 6:00 p.m.",
    location: "Bogota",
    phone: "3017505267",
    rules: ["No confirmar automaticamente."],
    structuredServices: [
      {
        id: "service-e2e",
        businessId: "business-e2e",
        name: "Limpieza dental",
        description: "Servicio de higiene oral.",
        minPrice: 120000,
        maxPrice: 120000,
        durationMinutes: 60,
        requiresEvaluation: false,
        isActive: true,
      },
    ],
  };
  const analysis = analyzeCommercialRequest(
    "Quiero agendar una limpieza dental el 20/08/2027 a las 10:00",
    business,
  );

  assert.deepEqual(analysis.appointmentDraft, {
    service: "Limpieza dental",
    preferredDate,
    preferredTime: "10:00",
  });

  const availability = validateAppointmentAvailability({
    appointment: {
      businessId: business.id,
      preferredDate,
      preferredTime: "10:00",
    },
    businessHours: [
      {
        id: "hours-e2e",
        businessId: business.id,
        dayOfWeek: new Date(`${preferredDate}T00:00:00Z`).getUTCDay(),
        opensAt: "08:00",
        closesAt: "18:00",
      },
    ],
    availabilitySlots: [],
    appointmentRequests: [],
  });

  assert.equal(availability.canCreateRequest, true);

  const confirmation = buildAppointmentConfirmationCopy({
    customerName: "Jorge",
    businessName: business.name,
    service: analysis.appointmentDraft.service,
    date: analysis.appointmentDraft.preferredDate,
    time: analysis.appointmentDraft.preferredTime,
  });
  assert.match(confirmation, /confirm/);
  assert.match(confirmation, /Limpieza dental/);
});
