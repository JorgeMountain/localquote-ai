import type { AppointmentRequest, AvailabilitySlot, BusinessHour } from "@/lib/types";

export type AvailabilityCheck = {
  canCreateRequest: boolean;
  available: boolean;
  message?: string;
  alternatives: string[];
};

export function validateAppointmentAvailability({
  appointment,
  businessHours,
  availabilitySlots,
  appointmentRequests,
}: {
  appointment: Pick<AppointmentRequest, "businessId" | "preferredDate" | "preferredTime">;
  businessHours: BusinessHour[];
  availabilitySlots: AvailabilitySlot[];
  appointmentRequests: AppointmentRequest[];
}): AvailabilityCheck {
  const preferredTime = normalizeTime(appointment.preferredTime);
  const dayOfWeek = getDayOfWeek(appointment.preferredDate);
  const dayHours = businessHours.filter((hour) => hour.dayOfWeek === dayOfWeek);
  const daySlots = availabilitySlots.filter((slot) => slot.date === appointment.preferredDate);

  const explicitSlot = daySlots.find((slot) => slot.startTime === preferredTime);
  if (explicitSlot?.status === "blocked" || explicitSlot?.status === "booked") {
    return {
      canCreateRequest: false,
      available: false,
      message: "Ese horario aparece bloqueado u ocupado en la agenda.",
      alternatives: suggestAlternatives(preferredTime, dayHours, daySlots, appointmentRequests, appointment.preferredDate),
    };
  }

  const hasStructuredHours = businessHours.length > 0;
  const insideWorkingHours = explicitSlot?.status === "available" || isInsideWorkingHours(preferredTime, dayHours);

  if (hasStructuredHours && !insideWorkingHours) {
    return {
      canCreateRequest: false,
      available: false,
      message: "Ese horario esta fuera del horario laboral configurado.",
      alternatives: suggestAlternatives(preferredTime, dayHours, daySlots, appointmentRequests, appointment.preferredDate),
    };
  }

  if (isAppointmentOccupied(appointmentRequests, appointment.preferredDate, preferredTime)) {
    return {
      canCreateRequest: false,
      available: false,
      message: "Ese horario ya tiene una solicitud pendiente o una cita confirmada.",
      alternatives: suggestAlternatives(preferredTime, dayHours, daySlots, appointmentRequests, appointment.preferredDate),
    };
  }

  if (!hasStructuredHours) {
    return {
      canCreateRequest: true,
      available: true,
      message: "La agenda estructurada aun no esta configurada; dejo la solicitud pendiente para revision del negocio.",
      alternatives: [],
    };
  }

  return { canCreateRequest: true, available: true, alternatives: [] };
}

export function buildAvailabilityReply(check: AvailabilityCheck) {
  if (check.available) return check.message;

  const alternatives =
    check.alternatives.length > 0
      ? ` Horarios alternativos disponibles: ${check.alternatives.join(", ")}.`
      : " No encontre horarios alternativos configurados para ese dia.";

  return `${check.message}${alternatives} Enviame otra hora preferida y lo reviso.`;
}

function suggestAlternatives(
  preferredTime: string,
  dayHours: BusinessHour[],
  daySlots: AvailabilitySlot[],
  appointmentRequests: AppointmentRequest[],
  preferredDate: string,
) {
  const candidates = new Set<string>();

  for (const slot of daySlots) {
    if (slot.status === "available") candidates.add(slot.startTime);
  }

  for (const hour of dayHours) {
    for (const time of timesBetween(hour.opensAt, hour.closesAt)) {
      candidates.add(time);
    }
  }

  return [...candidates]
    .filter((time) => time !== preferredTime)
    .filter((time) => !isSlotBlocked(daySlots, time))
    .filter((time) => !isAppointmentOccupied(appointmentRequests, preferredDate, time))
    .sort((left, right) => Math.abs(toMinutes(left) - toMinutes(preferredTime)) - Math.abs(toMinutes(right) - toMinutes(preferredTime)))
    .slice(0, 3);
}

function timesBetween(opensAt: string, closesAt: string) {
  const times: string[] = [];
  for (let minutes = toMinutes(opensAt); minutes < toMinutes(closesAt); minutes += 30) {
    times.push(fromMinutes(minutes));
  }
  return times;
}

function isInsideWorkingHours(time: string, dayHours: BusinessHour[]) {
  const minutes = toMinutes(time);
  return dayHours.some((hour) => minutes >= toMinutes(hour.opensAt) && minutes < toMinutes(hour.closesAt));
}

function isSlotBlocked(daySlots: AvailabilitySlot[], time: string) {
  return daySlots.some((slot) => slot.startTime === time && (slot.status === "blocked" || slot.status === "booked"));
}

function isAppointmentOccupied(appointments: AppointmentRequest[], date: string, time: string) {
  return appointments.some(
    (appointment) =>
      appointment.preferredDate === date &&
      normalizeTime(appointment.preferredTime) === time &&
      (appointment.status === "pending" || appointment.status === "confirmed"),
  );
}

function normalizeTime(value: string) {
  const [hours = "00", minutes = "00"] = value.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function toMinutes(time: string) {
  const [hours, minutes] = normalizeTime(time).split(":").map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function getDayOfWeek(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}
