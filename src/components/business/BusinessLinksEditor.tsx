"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createBusinessLinkWithFeedback, deleteBusinessLinkWithFeedback, updateBusinessLinkWithFeedback } from "@/app/server-actions/businesses";
import { ActionMessage } from "@/components/ActionForms";
import type { BusinessLink } from "@/lib/types";

export function BusinessLinksEditor({ businessId, links }: { businessId: string; links: BusinessLink[] }) {
  const [state, formAction] = useActionState(createBusinessLinkWithFeedback, null);
  return (
    <div className="mt-5 grid gap-4">
      <form action={formAction} className="grid gap-3 rounded-lg border border-black/10 bg-[#f8f6f1] p-4 md:grid-cols-2">
        <input type="hidden" name="business_id" value={businessId} />
        <input className={inputClass()} name="label" maxLength={120} placeholder="Nombre del enlace. Ej: Catalogo" required />
        <input className={inputClass()} name="url" maxLength={2048} placeholder="https://..." required />
        <PurposeSelect />
        <ActiveCheckbox />
        <textarea className={`${textareaClass()} md:col-span-2`} name="notes" maxLength={1000} placeholder="Cuando debe enviarlo." />
        <div className="flex flex-wrap items-center gap-3 md:col-span-2"><SubmitButton icon="plus" label="Agregar enlace" /><ActionMessage state={state} /></div>
      </form>
      <div className="grid gap-3">
        {links.map((link) => <BusinessLinkRow key={link.id} link={link} />)}
        {links.length === 0 && <p className="rounded-lg border border-dashed border-black/15 bg-[#f8f6f1] p-4 text-sm text-[#706d62]">No hay enlaces aprobados para el bot.</p>}
      </div>
    </div>
  );
}

function BusinessLinkRow({ link }: { link: BusinessLink }) {
  const [updateState, updateAction] = useActionState(updateBusinessLinkWithFeedback, null);
  const [deleteState, deleteAction] = useActionState(deleteBusinessLinkWithFeedback, null);
  return (
    <article className="rounded-lg border border-black/10 bg-[#f8f6f1] p-4">
      <form action={updateAction} className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="id" value={link.id} />
        <input className={`${inputClass()} font-semibold`} name="label" maxLength={120} defaultValue={link.label} required />
        <input className={inputClass()} name="url" maxLength={2048} defaultValue={link.url} required />
        <PurposeSelect defaultValue={link.purpose} />
        <ActiveCheckbox defaultChecked={link.isActive} />
        <textarea className={`${textareaClass()} md:col-span-2`} name="notes" maxLength={1000} defaultValue={link.notes} />
        <div className="flex flex-wrap items-center gap-2 md:col-span-2"><SubmitButton icon="save" label="Guardar enlace" /><ActionMessage state={updateState} compact /></div>
      </form>
      <form action={deleteAction} className="mt-2 flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={link.id} /><button className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/15 bg-white px-3 text-sm font-semibold"><Trash2 size={15} />Eliminar</button><ActionMessage state={deleteState} compact /></form>
    </article>
  );
}

function PurposeSelect({ defaultValue = "general" }: { defaultValue?: string }) {
  return <select className={inputClass()} name="purpose" defaultValue={defaultValue} aria-label="Uso del enlace"><option value="general">General</option><option value="booking">Reserva / agenda externa</option><option value="payment">Pago</option><option value="catalog">Catalogo</option><option value="location">Ubicacion</option><option value="support">Soporte</option></select>;
}
function ActiveCheckbox({ defaultChecked = true }: { defaultChecked?: boolean }) { return <label className="flex h-11 items-center gap-2 rounded-lg border border-black/15 bg-white px-3 text-sm"><input type="checkbox" name="is_active" defaultChecked={defaultChecked} />Activo para el bot</label>; }
function SubmitButton({ icon, label }: { icon: "plus" | "save"; label: string }) { const { pending } = useFormStatus(); const Icon = icon === "plus" ? Plus : Save; return <button disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-lg bg-black px-3 text-sm font-semibold text-white disabled:opacity-60"><Icon size={15} />{pending ? "Guardando" : label}</button>; }
function inputClass() { return "h-11 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-black"; }
function textareaClass() { return "min-h-24 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black"; }
