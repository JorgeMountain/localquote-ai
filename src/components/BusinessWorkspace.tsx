"use client";

import { Plus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { createFaq, updateBusiness } from "@/app/actions";
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
  const businessFaqs = useMemo(
    () => faqs.filter((faq) => faq.businessId === selectedBusiness.id),
    [faqs, selectedBusiness.id],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <form key={selectedBusiness.id} action={updateBusiness} className="rounded-md border border-black/10 bg-white p-5">
        <input type="hidden" name="id" value={selectedBusiness.id} />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Configuracion del negocio</h2>
            <p className="text-sm text-[#706d62]">Los cambios se guardan en Supabase con RLS por propietario.</p>
          </div>
          <button className="flex size-10 items-center justify-center rounded-md bg-black text-white" aria-label="Guardar">
            <Save size={17} />
          </button>
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Base de FAQs</h2>
            <p className="text-sm text-[#706d62]">Fuente principal para las respuestas IA.</p>
          </div>
          <button className="flex items-center gap-2 rounded-md bg-[#e2f26b] px-3 py-2 text-sm font-semibold text-black">
            <Plus size={16} />
            FAQ
          </button>
        </div>

        <form action={createFaq} className="mt-5 grid gap-3 rounded-md border border-black/10 bg-[#f8f6f1] p-4">
          <input type="hidden" name="business_id" value={selectedBusiness.id} />
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
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-black px-3 text-sm font-semibold text-white">
            <Plus size={16} />
            Crear FAQ
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {businessFaqs.map((faq) => (
            <article key={faq.id} className="rounded-md border border-black/10 bg-[#f8f6f1] p-4">
              <p className="text-sm font-semibold">{faq.question}</p>
              <p className="mt-2 text-sm leading-6 text-[#5f5b50]">{faq.answer}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#706d62]">
                {faq.category ?? "general"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
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
