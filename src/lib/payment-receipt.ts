export const allowedReceiptTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
export const maxReceiptFileSize = 5 * 1024 * 1024;

export function validatePaymentReceiptFile(file: Pick<File, "size" | "type"> | null) {
  if (!file || file.size <= 0) return "Selecciona una foto o PDF del comprobante.";
  if (!allowedReceiptTypes.has(file.type)) return "Formato no permitido. Usa JPG, PNG, WEBP o PDF.";
  if (file.size > maxReceiptFileSize) return "El archivo no puede superar 5 MB.";
  return null;
}

export function getPaymentReceiptExtension(name: string) {
  return name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
}
