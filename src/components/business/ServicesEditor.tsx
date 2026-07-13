"use client";

import { Save, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createBusinessServiceWithFeedback,
  deleteBusinessServiceWithFeedback,
  updateBusinessServiceWithFeedback,
} from "@/app/server-actions/services";
import { ActionMessage } from "@/components/ActionForms";
import type { BusinessService } from "@/lib/types";

export function ServicesEditor({ businessId, services }: { businessId: string; services: BusinessService[] }) {
  const [createState, createAction] = useActionState(createBusinessServiceWithFeedback, null);

  return (
    <div className="mt-5 grid gap-4">
      <form action={createAction} className="grid gap-3 rounded-lg border border-dashed border-black/15 bg-[#f8f6f1] p-4">
        <input type="hidden" name="business_id" value={businessId} />
        <p className="font-semibold">Agregar servicio</p>
        <ServiceFields />
        <div className="flex flex-wrap items-center gap-3">
          <ServiceSubmitButton label="Agregar servicio" />
          <ActionMessage state={createState} compact />
        </div>
      </form>

      <div className="grid gap-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
        {services.length === 0 && (
          <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-[#706d62]">
            No hay servicios estructurados. El bot no asignara precios hasta que agregues uno.
          </p>
        )}
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: BusinessService }) {
  const [updateState, updateAction] = useActionState(updateBusinessServiceWithFeedback, null);
  const [deleteState, deleteAction] = useActionState(deleteBusinessServiceWithFeedback, null);

  return (
    <article className="rounded-lg border border-black/10 p-4">
      <form action={updateAction} className="grid gap-3">
        <input type="hidden" name="id" value={service.id} />
        <ServiceFields service={service} />
        <div className="flex flex-wrap items-center gap-3">
          <ServiceSubmitButton label="Guardar servicio" />
          <ActionMessage state={updateState} compact />
        </div>
      </form>
      <form action={deleteAction} className="mt-3 flex flex-wrap items-center gap-3 border-t border-black/10 pt-3">
        <input type="hidden" name="id" value={service.id} />
        <button className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700">
          <Trash2 size={15} />
          Eliminar
        </button>
        <ActionMessage state={deleteState} compact />
      </form>
    </article>
  );
}

function ServiceFields({ service }: { service?: BusinessService }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="grid gap-1 text-sm font-medium">
        Nombre
        <input
          className="h-10 rounded-md border border-black/15 bg-white px-3"
          name="name"
          defaultValue={service?.name ?? ""}
          maxLength={120}
          required
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Duracion en minutos
        <input
          className="h-10 rounded-md border border-black/15 bg-white px-3"
          name="duration_minutes"
          type="number"
          min="1"
          max="1440"
          defaultValue={service?.durationMinutes ?? ""}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Precio minimo (COP)
        <input
          className="h-10 rounded-md border border-black/15 bg-white px-3"
          name="min_price"
          type="number"
          min="0"
          step="1"
          defaultValue={service?.minPrice ?? ""}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Precio maximo (COP)
        <input
          className="h-10 rounded-md border border-black/15 bg-white px-3"
          name="max_price"
          type="number"
          min="0"
          step="1"
          defaultValue={service?.maxPrice ?? ""}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium md:col-span-2">
        Descripcion y condiciones
        <textarea
          className="min-h-24 rounded-md border border-black/15 bg-white px-3 py-2"
          name="description"
          defaultValue={service?.description ?? ""}
          maxLength={1000}
        />
      </label>
      <label className="inline-flex items-center gap-2 text-sm">
        <input name="requires_evaluation" type="checkbox" defaultChecked={service?.requiresEvaluation ?? false} />
        Requiere valoracion previa
      </label>
      <label className="inline-flex items-center gap-2 text-sm">
        <input name="is_active" type="checkbox" defaultChecked={service?.isActive ?? true} />
        Servicio activo y visible para el bot
      </label>
    </div>
  );
}

function ServiceSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="inline-flex h-9 items-center gap-2 rounded-md bg-black px-3 text-sm font-semibold text-white disabled:opacity-60"
      disabled={pending}
    >
      <Save size={15} />
      {pending ? "Guardando" : label}
    </button>
  );
}
