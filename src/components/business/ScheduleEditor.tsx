"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createAvailabilitySlotWithFeedback,
  deleteAvailabilitySlotWithFeedback,
  saveBusinessHoursWithFeedback,
} from "@/app/server-actions/schedules";
import { ActionMessage } from "@/components/ActionForms";
import type { AvailabilitySlot, Business, BusinessHour } from "@/lib/types";

const weekDays = [
  { value: 1, label: "Lunes" }, { value: 2, label: "Martes" }, { value: 3, label: "Miercoles" },
  { value: 4, label: "Jueves" }, { value: 5, label: "Viernes" }, { value: 6, label: "Sabado" },
  { value: 0, label: "Domingo" },
];

export function ScheduleEditor({ business, businessHours, availabilitySlots }: { business: Business; businessHours: BusinessHour[]; availabilitySlots: AvailabilitySlot[] }) {
  const [hoursState, hoursAction] = useActionState(saveBusinessHoursWithFeedback, null);
  const [slotState, slotAction] = useActionState(createAvailabilitySlotWithFeedback, null);
  return (
    <div className="mt-5 grid gap-5">
      <form action={hoursAction} className="rounded-lg border border-black/10 bg-[#f8f6f1] p-4">
        <input type="hidden" name="business_id" value={business.id} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="font-semibold">Horario semanal opcional</h3><p className="mt-1 text-sm text-[#706d62]">Si lo dejas vacio, el bot solo registra solicitudes pendientes.</p></div>
          <SubmitButton icon="save" label="Guardar horario" />
        </div>
        <div className="mt-4 grid gap-3">
          {weekDays.map((day) => {
            const current = businessHours.find((hour) => hour.dayOfWeek === day.value);
            return (
              <div key={day.value} className="grid gap-3 rounded-lg border border-black/10 bg-white p-3 md:grid-cols-[1fr_1fr_1fr] md:items-center">
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name={`day_${day.value}_enabled`} defaultChecked={Boolean(current)} />{day.label}</label>
                <input className={inputClass()} type="time" name={`day_${day.value}_opens`} defaultValue={current?.opensAt ?? "09:00"} />
                <input className={inputClass()} type="time" name={`day_${day.value}_closes`} defaultValue={current?.closesAt ?? "18:00"} />
              </div>
            );
          })}
        </div>
        <div className="mt-4"><ActionMessage state={hoursState} /></div>
      </form>

      <form action={slotAction} className="rounded-lg border border-black/10 bg-[#f8f6f1] p-4">
        <input type="hidden" name="business_id" value={business.id} />
        <h3 className="font-semibold">Excepciones por fecha</h3>
        <p className="mt-1 text-sm text-[#706d62]">Abre cupos especiales, bloquea horas o marca horas ocupadas.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className={inputClass()} type="date" name="date" required />
          <select className={inputClass()} name="status" defaultValue="blocked"><option value="available">Disponible especial</option><option value="blocked">Bloqueado</option><option value="booked">Ocupado</option></select>
          <input className={inputClass()} type="time" name="start_time" defaultValue="09:00" required />
          <input className={inputClass()} type="time" name="end_time" defaultValue="09:30" required />
          <input className={`${inputClass()} md:col-span-2`} name="notes" placeholder="Nota opcional" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3"><SubmitButton icon="plus" label="Agregar excepcion" /><ActionMessage state={slotState} /></div>
      </form>

      <div className="rounded-lg border border-black/10 bg-white p-4">
        <h3 className="font-semibold">Excepciones guardadas</h3>
        <div className="mt-3 grid gap-2">
          {availabilitySlots.map((slot) => <AvailabilitySlotRow key={slot.id} slot={slot} />)}
          {availabilitySlots.length === 0 && <p className="rounded-lg border border-dashed border-black/15 bg-[#f8f6f1] p-4 text-sm text-[#706d62]">No hay excepciones configuradas.</p>}
        </div>
      </div>
    </div>
  );
}

function AvailabilitySlotRow({ slot }: { slot: AvailabilitySlot }) {
  const [state, formAction] = useActionState(deleteAvailabilitySlotWithFeedback, null);
  const labels = { available: "Disponible", blocked: "Bloqueado", booked: "Ocupado" };
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-black/10 bg-[#f8f6f1] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm"><p className="font-semibold">{slot.date} · {slot.startTime} - {slot.endTime}</p><p className="mt-1 text-[#706d62]">{labels[slot.status]}{slot.notes ? ` · ${slot.notes}` : ""}</p></div>
      <form action={formAction} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={slot.id} /><button className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/15 bg-white px-3 text-sm font-semibold"><Trash2 size={15} />Eliminar</button><ActionMessage state={state} compact /></form>
    </article>
  );
}

function SubmitButton({ icon, label }: { icon: "save" | "plus"; label: string }) {
  const { pending } = useFormStatus();
  const Icon = icon === "save" ? Save : Plus;
  return <button disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-black px-4 text-sm font-semibold text-white disabled:opacity-60"><Icon size={15} />{pending ? "Guardando" : label}</button>;
}

function inputClass() { return "h-11 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-black"; }
