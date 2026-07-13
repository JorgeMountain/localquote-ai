"use client";

import { Building2, Save } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateBusinessWithFeedback } from "@/app/server-actions/businesses";
import { ActionMessage } from "@/components/ActionForms";
import { BotRulesEditor } from "@/components/business/BotRulesEditor";
import type { Business } from "@/lib/types";

export function BusinessProfileForm({ business }: { business: Business }) {
  const [state, formAction] = useActionState(updateBusinessWithFeedback, null);
  return (
    <form key={business.id} action={formAction} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={business.id} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-black text-white"><Building2 size={18} /></span><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#706d62]">Paso 1</p><h2 className="mt-1 text-xl font-semibold">Datos del negocio</h2><p className="mt-1 text-sm leading-6 text-[#706d62]">Contexto basico e instrucciones generales.</p></div></div>
        <SubmitButton />
      </div>
      <div className="mt-4"><ActionMessage state={state} /></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field name="name" label="Nombre visible" defaultValue={business.name} maxLength={120} required />
        <Field name="phone" label="Telefono o WhatsApp" defaultValue={business.phone} maxLength={32} required />
        <Field name="location" label="Direccion o zona de cobertura" defaultValue={business.location} maxLength={500} required />
        <Field name="hours" label="Horarios generales" defaultValue={business.hours} maxLength={2000} textarea required />
        <Field name="description" label="Que hace el negocio" defaultValue={business.description} maxLength={2000} textarea required />
        <Field name="services" label="Texto heredado de servicios" defaultValue={business.services.join("\n")} maxLength={8000} textarea hint="Respaldo temporal. Los precios se gestionan en Servicios y precios." />
        <BotRulesEditor rules={business.rules} />
      </div>
      <details className="mt-5 rounded-lg border border-black/10 bg-[#f8f6f1] p-4">
        <summary className="cursor-pointer text-sm font-semibold">Opciones tecnicas de WhatsApp</summary>
        <p className="mt-2 text-sm leading-6 text-[#706d62]">
          Solo necesitas esto cuando conectes un numero de Meta. El identificador le dice a Tactio desde que linea llegaron los mensajes.
        </p>
        <div className="mt-4 max-w-xl">
          <Field
            name="whatsapp_phone_number_id"
            label="Identificador del numero de WhatsApp (opcional)"
            defaultValue={business.whatsappPhoneNumberId ?? ""}
            maxLength={32}
            hint="Copialo desde Meta cuando tengas el numero conectado. No es el telefono visible para tus clientes."
          />
        </div>
      </details>
    </form>
  );
}

function Field({ name, label, defaultValue, maxLength, textarea, required, hint }: { name: string; label: string; defaultValue: string; maxLength: number; textarea?: boolean; required?: boolean; hint?: string }) {
  const className = `${textarea ? "min-h-28 py-2" : "h-11"} rounded-lg border border-black/15 bg-[#f8f6f1] px-3 text-sm font-normal outline-none focus:border-black`;
  return <label className="grid gap-2 text-sm font-semibold">{label}{textarea ? <textarea className={className} name={name} defaultValue={defaultValue} maxLength={maxLength} required={required} /> : <input className={className} name={name} defaultValue={defaultValue} maxLength={maxLength} required={required} />}{hint && <span className="text-xs font-normal leading-5 text-[#706d62]">{hint}</span>}</label>;
}

function SubmitButton() { const { pending } = useFormStatus(); return <button disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-black px-4 text-sm font-semibold text-white disabled:opacity-60"><Save size={15} />{pending ? "Guardando" : "Guardar negocio"}</button>; }
