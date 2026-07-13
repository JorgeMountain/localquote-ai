export function buildAppointmentConfirmationCopy(input: {
  customerName: string;
  businessName: string;
  service: string;
  date: string;
  time: string;
}) {
  const greeting = input.customerName ? `Hola, ${input.customerName}.` : "Hola.";
  return [
    greeting,
    `${input.businessName} confirmo tu cita.`,
    `Servicio: ${input.service}`,
    `Fecha: ${input.date}`,
    `Hora: ${input.time}`,
    "Si necesitas cambiarla, responde a este mensaje.",
  ].join("\n");
}
