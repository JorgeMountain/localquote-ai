import type { AppointmentRequest } from "@/lib/types";
import type { CommercialAnalysis } from "@/lib/commercial";

type AppointmentDraft = NonNullable<CommercialAnalysis["appointmentDraft"]>;

export function findMatchingActiveAppointment(
  appointments: AppointmentRequest[],
  customerId: string,
  draft: AppointmentDraft,
) {
  return appointments.find(
    (appointment) =>
      appointment.customerId === customerId
      && appointment.preferredDate === draft.preferredDate
      && normalizeTime(appointment.preferredTime) === normalizeTime(draft.preferredTime)
      && normalizeText(appointment.service) === normalizeText(draft.service)
      && (appointment.status === "pending" || appointment.status === "confirmed"),
  );
}

export function canCreateQuote(hasOpenQuote: boolean) {
  return !hasOpenQuote;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeTime(value: string) {
  return value.slice(0, 5);
}
