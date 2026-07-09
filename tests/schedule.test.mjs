import assert from "node:assert/strict";
import test from "node:test";
import { validateAppointmentAvailability } from "../src/lib/schedule.ts";

const appointment = {
  businessId: "business",
  preferredDate: "2027-07-10",
  preferredTime: "10:30",
};

const businessHours = [
  {
    id: "hours",
    businessId: "business",
    dayOfWeek: 6,
    opensAt: "08:00",
    closesAt: "13:00",
  },
];

test("detecta una hora dentro de un intervalo bloqueado", () => {
  const result = validateAppointmentAvailability({
    appointment,
    businessHours,
    availabilitySlots: [
      {
        id: "blocked",
        businessId: "business",
        date: appointment.preferredDate,
        startTime: "10:00",
        endTime: "12:00",
        status: "blocked",
      },
    ],
    appointmentRequests: [],
  });

  assert.equal(result.canCreateRequest, false);
  assert.match(result.message ?? "", /bloqueado u ocupado/);
});

test("detecta una cita activa en la misma hora", () => {
  const result = validateAppointmentAvailability({
    appointment,
    businessHours,
    availabilitySlots: [],
    appointmentRequests: [
      {
        id: "appointment",
        businessId: "business",
        customerId: "customer",
        service: "Servicio",
        preferredDate: appointment.preferredDate,
        preferredTime: appointment.preferredTime,
        status: "confirmed",
      },
    ],
  });

  assert.equal(result.canCreateRequest, false);
  assert.match(result.message ?? "", /ya tiene una solicitud/);
});

test("permite solicitudes sin agenda estructurada", () => {
  const result = validateAppointmentAvailability({
    appointment,
    businessHours: [],
    availabilitySlots: [],
    appointmentRequests: [],
  });

  assert.equal(result.canCreateRequest, true);
  assert.match(result.message ?? "", /aun no esta configurada/);
});
