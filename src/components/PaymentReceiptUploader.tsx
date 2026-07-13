"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getPaymentReceiptExtension, validatePaymentReceiptFile } from "@/lib/payment-receipt";
import { createClient } from "@/lib/supabase/client";
import type { Business } from "@/lib/types";

export function PaymentReceiptUploader({
  businesses,
  defaultBusinessId,
}: {
  businesses: Business[];
  defaultBusinessId?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsUploading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const businessId = String(formData.get("business_id") ?? "");
    const file = formData.get("receipt");

    const fileError = validatePaymentReceiptFile(file instanceof File ? file : null);
    if (fileError || !(file instanceof File)) {
      setMessage(fileError ?? "Selecciona una foto o PDF del comprobante.");
      setIsUploading(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Tu sesión expiró. Vuelve a iniciar sesión.");
      setIsUploading(false);
      return;
    }

    const extension = getPaymentReceiptExtension(file.name);
    const objectPath = `${businessId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-receipts")
      .upload(objectPath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setMessage(uploadError.message);
      setIsUploading(false);
      return;
    }

    const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
    const { error: insertError } = await supabase.from("payment_receipts").insert({
      business_id: businessId,
      uploaded_by: user.id,
      object_path: objectPath,
      original_name: file.name,
      mime_type: file.type,
      amount_cents: Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null,
      billing_period: String(formData.get("billing_period") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim(),
    });

    if (insertError) {
      await supabase.storage.from("payment-receipts").remove([objectPath]);
      setMessage(insertError.message);
      setIsUploading(false);
      return;
    }

    form.reset();
    setMessage("Comprobante enviado para revisión.");
    setIsUploading(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Subir comprobante de pago</h2>
        <p className="mt-1 text-sm text-[#706d62]">La imagen queda privada y solo la ven el negocio y el administrador.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Negocio
          <select
            className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm"
            name="business_id"
            defaultValue={defaultBusinessId ?? businesses[0]?.id}
            required
          >
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Periodo pagado
          <input
            className="h-11 rounded-md border border-black/15 px-3 text-sm"
            name="billing_period"
            type="month"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Valor pagado (COP)
          <input
            className="h-11 rounded-md border border-black/15 px-3 text-sm"
            min="0"
            name="amount"
            placeholder="Ej. 150000"
            step="1"
            type="number"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Foto o PDF
          <input
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="rounded-md border border-black/15 bg-[#f8f6f1] p-2 text-sm"
            name="receipt"
            required
            type="file"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-semibold">
        Nota opcional
        <input
          className="h-11 rounded-md border border-black/15 px-3 text-sm"
          name="notes"
          placeholder="Ej. Transferencia Bancolombia"
        />
      </label>

      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white disabled:opacity-60"
        disabled={isUploading}
      >
        {isUploading ? <Loader2 className="animate-spin" size={17} /> : <FileUp size={17} />}
        {isUploading ? "Subiendo" : "Enviar comprobante"}
      </button>
      {message && <p className="rounded-md bg-[#f1eee6] p-3 text-sm text-[#5f5b50]" role="status">{message}</p>}
    </form>
  );
}
