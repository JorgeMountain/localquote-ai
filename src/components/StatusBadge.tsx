const labels: Record<string, string> = {
  new: "Nuevo",
  qualified: "Calificado",
  appointment: "Cita",
  quoted: "Cotizado",
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  approved: "Aprobado",
  rejected: "Rechazada",
  faq: "FAQ",
  quote: "Cotizacion",
  handoff: "Confirmar",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-black/10 bg-[#f1eee6] px-2 py-1 text-xs font-medium text-[#37342c]">
      {labels[value] ?? value}
    </span>
  );
}
