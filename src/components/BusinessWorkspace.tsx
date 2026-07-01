"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createBusinessWithFeedback,
  createFaqWithFeedback,
  deleteFaqWithFeedback,
  updateBusinessWithFeedback,
  updateFaqWithFeedback,
} from "@/app/actions";
import { ActionMessage } from "@/components/ActionForms";
import type { Business, BusinessFaq } from "@/lib/types";

export function BusinessWorkspace({
  businesses,
  faqs,
}: {
  businesses: Business[];
  faqs: BusinessFaq[];
}) {
  const [selectedId, setSelectedId] = useState(businesses[0]?.id ?? "");
  const selectedBusiness = businesses.find((business) => business.id === selectedId) ?? businesses[0];
  const [businessState, businessAction] = useActionState(updateBusinessWithFeedback, null);
  const businessFaqs = useMemo(
    () => (selectedBusiness ? faqs.filter((faq) => faq.businessId === selectedBusiness.id) : []),
    [faqs, selectedBusiness],
  );

  return (
    <div className="grid gap-6">
      <CreateBusinessForm />

      {selectedBusiness ? (
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <form key={selectedBusiness.id} action={businessAction} className="rounded-md border border-black/10 bg-white p-5">
            <input type="hidden" name="id" value={selectedBusiness.id} />
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Configuracion del negocio</h2>
                <p className="text-sm text-[#706d62]">Los cambios se guardan en Supabase con RLS por propietario.</p>
              </div>
              <IconSubmitButton label="Guardar negocio" />
            </div>
            <div className="mt-4">
              <ActionMessage state={businessState} />
            </div>

            <select
              className="mt-5 h-11 w-full rounded-md border border-black/15 bg-[#f8f6f1] px-3 text-sm"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>

            <div className="mt-5 grid gap-4">
              <Field name="name" label="Nombre" defaultValue={selectedBusiness.name} />
              <Field name="description" label="Descripcion" defaultValue={selectedBusiness.description} textarea />
              <Field name="services" label="Servicios" defaultValue={selectedBusiness.services.join(", ")} />
              <Field name="hours" label="Horarios" defaultValue={selectedBusiness.hours} />
              <Field name="location" label="Direccion o cobertura" defaultValue={selectedBusiness.location} />
              <Field name="phone" label="Telefono/WhatsApp" defaultValue={selectedBusiness.phone} />
              <Field name="rules" label="Reglas importantes" defaultValue={selectedBusiness.rules.join("\n")} textarea />
            </div>
          </form>

          <section className="rounded-md border border-black/10 bg-white p-5">
            <div>
              <h2 className="text-xl font-semibold">Base de FAQs</h2>
              <p className="text-sm text-[#706d62]">Fuente principal para las respuestas IA.</p>
            </div>

            <CreateFaqForm businessId={selectedBusiness.id} />

            <div className="mt-5 space-y-3">
              {businessFaqs.map((faq) => (
                <FaqEditor key={faq.id} faq={faq} />
              ))}
            </div>
          </section>
        </div>
      ) : (
        <section className="rounded-md border border-black/10 bg-white p-5">
          <h2 className="text-xl font-semibold">Sin negocios todavia</h2>
          <p className="mt-2 text-sm text-[#706d62]">
            Crea el primer negocio manualmente o usa el boton de datos demo del dashboard.
          </p>
        </section>
      )}
    </div>
  );
}

function CreateBusinessForm() {
  const [state, formAction] = useActionState(createBusinessWithFeedback, null);

  return (
    <form action={formAction} className="rounded-md border border-black/10 bg-[#111111] p-5 text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Crear negocio</h2>
          <p className="mt-1 text-sm text-white/65">Alta rapida para un odontologo o tecnico de reparacion.</p>
        </div>
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#e2f26b] px-3 text-sm font-semibold text-black">
          <Plus size={16} />
          Crear
        </button>
      </div>

      <div className="mt-4">
        <ActionMessage state={state} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input className="h-11 rounded-md border border-white/15 bg-white px-3 text-sm text-black" name="name" placeholder="Nombre" required />
        <input className="h-11 rounded-md border border-white/15 bg-white px-3 text-sm text-black" name="slug" placeholder="slug-publico" />
        <select className="h-11 rounded-md border border-white/15 bg-white px-3 text-sm text-black" name="type" defaultValue="repair">
          <option value="repair">Tecnico de reparacion</option>
          <option value="dentist">Odontologo</option>
        </select>
        <input className="h-11 rounded-md border border-white/15 bg-white px-3 text-sm text-black" name="phone" placeholder="Telefono/WhatsApp" required />
        <input className="h-11 rounded-md border border-white/15 bg-white px-3 text-sm text-black md:col-span-2" name="location" placeholder="Direccion o cobertura" required />
        <input className="h-11 rounded-md border border-white/15 bg-white px-3 text-sm text-black md:col-span-2" name="hours" placeholder="Horarios" required />
        <textarea className="min-h-20 rounded-md border border-white/15 bg-white px-3 py-2 text-sm text-black xl:col-span-2" name="description" placeholder="Descripcion del negocio" required />
        <textarea className="min-h-20 rounded-md border border-white/15 bg-white px-3 py-2 text-sm text-black" name="services" placeholder="Servicios, separados por coma o salto de linea" required />
        <textarea className="min-h-20 rounded-md border border-white/15 bg-white px-3 py-2 text-sm text-black" name="rules" placeholder="Reglas, precios base, politicas" required />
      </div>
    </form>
  );
}

function CreateFaqForm({ businessId }: { businessId: string }) {
  const [state, formAction] = useActionState(createFaqWithFeedback, null);

  return (
    <form action={formAction} className="mt-5 grid gap-3 rounded-md border border-black/10 bg-[#f8f6f1] p-4">
      <input type="hidden" name="business_id" value={businessId} />
      <input
        className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm outline-none focus:border-black"
        name="question"
        placeholder="Nueva pregunta"
        required
      />
      <textarea
        className="min-h-24 rounded-md border border-black/15 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-black"
        name="answer"
        placeholder="Respuesta aprobada por el negocio"
        required
      />
      <input
        className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm outline-none focus:border-black"
        name="category"
        placeholder="Categoria opcional"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-black px-3 text-sm font-semibold text-white">
          <Plus size={16} />
          Crear FAQ
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function FaqEditor({ faq }: { faq: BusinessFaq }) {
  const [updateState, updateAction] = useActionState(updateFaqWithFeedback, null);
  const [deleteState, deleteAction] = useActionState(deleteFaqWithFeedback, null);

  return (
    <article className="rounded-md border border-black/10 bg-[#f8f6f1] p-4">
      <form action={updateAction} className="grid gap-3">
        <input type="hidden" name="id" value={faq.id} />
        <input
          className="h-10 rounded-md border border-black/15 bg-white px-3 text-sm font-semibold outline-none focus:border-black"
          name="question"
          defaultValue={faq.question}
        />
        <textarea
          className="min-h-20 rounded-md border border-black/15 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-black"
          name="answer"
          defaultValue={faq.answer}
        />
        <input
          className="h-10 rounded-md border border-black/15 bg-white px-3 text-sm outline-none focus:border-black"
          name="category"
          defaultValue={faq.category ?? ""}
          placeholder="Categoria"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-black px-3 text-sm font-semibold text-white">
            <Save size={15} />
            Guardar FAQ
          </button>
          <ActionMessage state={updateState} compact />
        </div>
      </form>
      <form action={deleteAction} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={faq.id} />
        <button className="inline-flex h-9 items-center gap-2 rounded-md border border-black/15 bg-white px-3 text-sm font-semibold">
          <Trash2 size={15} />
          Eliminar
        </button>
        <ActionMessage state={deleteState} compact />
      </form>
    </article>
  );
}

function IconSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="flex size-10 items-center justify-center rounded-md bg-black text-white disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={label}
      disabled={pending}
    >
      {pending ? (
        <span className="size-4 rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        <Save size={17} />
      )}
    </button>
  );
}

function Field({
  name,
  label,
  defaultValue,
  textarea,
}: {
  name: string;
  label: string;
  defaultValue: string;
  textarea?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {textarea ? (
        <textarea
          name={name}
          className="min-h-24 rounded-md border border-black/15 bg-[#f8f6f1] px-3 py-2 font-normal leading-6 outline-none focus:border-black"
          defaultValue={defaultValue}
        />
      ) : (
        <input
          name={name}
          className="h-11 rounded-md border border-black/15 bg-[#f8f6f1] px-3 font-normal outline-none focus:border-black"
          defaultValue={defaultValue}
        />
      )}
    </label>
  );
}
