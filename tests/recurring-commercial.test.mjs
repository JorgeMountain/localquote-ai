import assert from "node:assert/strict";
import test from "node:test";
import { canCreateQuote, findMatchingActiveAppointment } from "../src/lib/chat-policy.ts";
import { validateAppointmentAvailability } from "../src/lib/schedule.ts";

const existingAppointment = {
  id: "appointment-1",
  businessId: "business-1",
  customerId: "customer-1",
  service: "Limpieza dental",
  preferredDate: "2027-08-20",
  preferredTime: "10:00",
  status: "confirmed",
};

test("permite una nueva cotizacion cuando no existe otra abierta", () => {
  assert.equal(canCreateQuote(false), true);
  assert.equal(canCreateQuote(true), false);
});

test("un cliente recurrente puede pedir otra cita en una fecha diferente", () => {
  const nextDraft = {
    service: "Limpieza dental",
    preferredDate: "2027-09-20",
    preferredTime: "10:00",
  };

  assert.equal(findMatchingActiveAppointment([existingAppointment], "customer-1", nextDraft), undefined);
});

test("reconoce una solicitud repetida del mismo cliente", () => {
  const sameDraft = {
    service: "limpieza dental",
    preferredDate: existingAppointment.preferredDate,
    preferredTime: existingAppointment.preferredTime,
  };

  assert.equal(findMatchingActiveAppointment([existingAppointment], "customer-1", sameDraft)?.id, existingAppointment.id);
});

test("mantiene bloqueado un horario ocupado por otro cliente", () => {
  const result = validateAppointmentAvailability({
    appointment: {
      businessId: "business-1",
      preferredDate: existingAppointment.preferredDate,
      preferredTime: existingAppointment.preferredTime,
    },
    businessHours: [],
    availabilitySlots: [],
    appointmentRequests: [existingAppointment],
  });

  assert.equal(result.canCreateRequest, false);
});
