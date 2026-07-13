const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function requiredText(formData: FormData, name: string, label: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) throw new Error(`${label} es obligatorio.`);
  if (value.length > maxLength) throw new Error(`${label} no puede superar ${maxLength} caracteres.`);
  return value;
}

export function optionalText(formData: FormData, name: string, label: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  if (value.length > maxLength) throw new Error(`${label} no puede superar ${maxLength} caracteres.`);
  return value;
}

export function requiredUuid(formData: FormData, name: string, label = "Identificador") {
  const value = requiredText(formData, name, label, 36);
  if (!isUuid(value)) throw new Error(`${label} no es valido.`);
  return value;
}

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function isPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function optionalInteger(
  formData: FormData,
  name: string,
  label: string,
  options: { min?: number; max?: number } = {},
) {
  const rawValue = String(formData.get(name) ?? "").trim();
  if (!rawValue) return null;
  if (!/^\d+$/.test(rawValue)) throw new Error(`${label} debe ser un numero entero.`);

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value)) throw new Error(`${label} esta fuera del rango permitido.`);
  if (options.min !== undefined && value < options.min) throw new Error(`${label} debe ser al menos ${options.min}.`);
  if (options.max !== undefined && value > options.max) throw new Error(`${label} no puede superar ${options.max}.`);
  return value;
}

export function requiredPhone(formData: FormData, name: string, label = "Telefono") {
  const value = requiredText(formData, name, label, 32);
  if (!isPhone(value)) throw new Error(`${label} debe tener entre 8 y 15 digitos.`);
  return value;
}

export function requiredDate(formData: FormData, name: string, label = "Fecha") {
  const value = requiredText(formData, name, label, 10);
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${label} no es valida.`);
  }
  return value;
}

export function requiredTime(formData: FormData, name: string, label = "Hora") {
  const value = requiredText(formData, name, label, 5);
  if (!TIME_PATTERN.test(value)) throw new Error(`${label} debe usar el formato HH:MM.`);
  return value;
}

export function requiredHttpUrl(formData: FormData, name: string, label = "Enlace") {
  const value = requiredText(formData, name, label, 2048);
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new Error(`${label} debe empezar por http:// o https://.`);
  }
}
