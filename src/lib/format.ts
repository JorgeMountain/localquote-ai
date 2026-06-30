export function currencyCop(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function shortDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    day: "numeric",
    hour: value.includes("T") ? "2-digit" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
  }).format(new Date(value));
}
