"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createFaqWithFeedback, deleteFaqWithFeedback, updateFaqWithFeedback } from "@/app/server-actions/faqs";
import { ActionMessage } from "@/components/ActionForms";
import type { BusinessFaq } from "@/lib/types";

export function FaqEditor({ businessId, faqs }: { businessId: string; faqs: BusinessFaq[] }) {
  return (
    <>
      <CreateFaqForm businessId={businessId} />
      <div className="mt-5 grid gap-3">
        {faqs.map((faq) => <FaqRow key={faq.id} faq={faq} />)}
        {faqs.length === 0 && <div className="rounded-lg border border-dashed border-black/15 bg-[#f8f6f1] p-5 text-sm text-[#706d62]">Todavia no hay FAQs. Crea al menos una con una pregunta real de cliente.</div>}
      </div>
    </>
  );
}

function CreateFaqForm({ businessId }: { businessId: string }) {
  const [state, formAction] = useActionState(createFaqWithFeedback, null);
  return (
    <form action={formAction} className="mt-5 grid gap-3 rounded-lg border border-black/10 bg-[#f8f6f1] p-4">
      <input type="hidden" name="business_id" value={businessId} />
      <input className={inputClass()} name="question" maxLength={500} placeholder="Pregunta real del cliente" required />
      <textarea className={textareaClass()} name="answer" maxLength={3000} placeholder="Respuesta exacta que quieres que use el bot" required />
      <input className={inputClass()} name="category" maxLength={80} placeholder="Categoria opcional: precios, horarios, citas..." />
      <div className="flex flex-wrap items-center gap-3"><SubmitButton icon="plus" label="Crear FAQ" /><ActionMessage state={state} /></div>
    </form>
  );
}

function FaqRow({ faq }: { faq: BusinessFaq }) {
  const [updateState, updateAction] = useActionState(updateFaqWithFeedback, null);
  const [deleteState, deleteAction] = useActionState(deleteFaqWithFeedback, null);
  return (
    <article className="rounded-lg border border-black/10 bg-[#f8f6f1] p-4">
      <form action={updateAction} className="grid gap-3">
        <input type="hidden" name="id" value={faq.id} />
        <input className={`${inputClass()} font-semibold`} name="question" maxLength={500} defaultValue={faq.question} required />
        <textarea className={textareaClass()} name="answer" maxLength={3000} defaultValue={faq.answer} required />
        <input className={inputClass()} name="category" maxLength={80} defaultValue={faq.category ?? ""} placeholder="Categoria" />
        <div className="flex flex-wrap items-center gap-2"><SubmitButton icon="save" label="Guardar FAQ" /><ActionMessage state={updateState} compact /></div>
      </form>
      <form action={deleteAction} className="mt-2 flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={faq.id} /><button className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/15 bg-white px-3 text-sm font-semibold"><Trash2 size={15} />Eliminar</button><ActionMessage state={deleteState} compact /></form>
    </article>
  );
}

function SubmitButton({ icon, label }: { icon: "plus" | "save"; label: string }) {
  const { pending } = useFormStatus();
  const Icon = icon === "plus" ? Plus : Save;
  return <button disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-lg bg-black px-3 text-sm font-semibold text-white disabled:opacity-60"><Icon size={15} />{pending ? "Guardando" : label}</button>;
}

function inputClass() { return "h-11 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-black"; }
function textareaClass() { return "min-h-24 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black"; }
