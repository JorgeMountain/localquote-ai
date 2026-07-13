"use client";

import { Check, Send, Save } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  confirmAppointmentAndNotifyWithFeedback,
  sendQuoteAndNotifyWithFeedback,
  updateAppointmentStatusWithFeedback,
  updateCustomerStatusWithFeedback,
  updatePaymentReceiptStatusWithFeedback,
  updateQuoteStatusWithFeedback,
  type ActionState,
} from "@/app/actions";
import type { AppointmentStatus, LeadStatus, PaymentReceiptStatus, QuoteStatus } from "@/lib/types";

export function CustomerStatusForm({ id, status }: { id: string; status: LeadStatus }) {
  const [state, formAction] = useActionState(updateCustomerStatusWithFeedback, null);

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-center gap-2">
        <select className="h-9 rounded-md border border-black/15 bg-[#f8f6f1] px-2 text-sm" name="status" defaultValue={status}>
          <option value="new">Nuevo</option>
          <option value="qualified">Calificado</option>
          <option value="appointment">Cita</option>
          <option value="quoted">Cotizado</option>
        </select>
        <SubmitButton label="Guardar" />
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function AppointmentStatusForm({ id, status }: { id: string; status: AppointmentStatus }) {
  const [state, formAction] = useActionState(updateAppointmentStatusWithFeedback, null);

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-center gap-2">
        <select className="h-9 rounded-md border border-black/15 bg-[#f8f6f1] px-2 text-sm" name="status" defaultValue={status}>
          <option value="pending">Pendiente</option>
          <option value="confirmed">Confirmada (solo estado)</option>
          <option value="cancelled">Cancelada</option>
        </select>
        <SubmitButton label="Guardar" />
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function QuoteStatusForm({ id, status }: { id: string; status: QuoteStatus }) {
  const [state, formAction] = useActionState(updateQuoteStatusWithFeedback, null);

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-center gap-2">
        <select className="h-9 rounded-md border border-black/15 bg-[#f8f6f1] px-2 text-sm" name="status" defaultValue={status}>
          <option value="draft">Borrador</option>
          <option value="sent">Enviada (solo estado)</option>
          <option value="accepted">Aceptada</option>
          <option value="rejected">Rechazada</option>
        </select>
        <SubmitButton label="Guardar" />
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function PaymentReceiptStatusForm({
  id,
  status,
  reviewNotes,
}: {
  id: string;
  status: PaymentReceiptStatus;
  reviewNotes: string;
}) {
  const [state, formAction] = useActionState(updatePaymentReceiptStatusWithFeedback, null);

  return (
    <form action={formAction} className="grid min-w-64 gap-2">
      <input type="hidden" name="id" value={id} />
      <select
        className="h-9 rounded-md border border-black/15 bg-[#f8f6f1] px-2 text-sm"
        name="status"
        defaultValue={status}
      >
        <option value="pending">Pendiente</option>
        <option value="approved">Aprobado</option>
        <option value="rejected">Rechazado</option>
      </select>
      <input
        className="h-9 rounded-md border border-black/15 bg-white px-2 text-sm"
        name="review_notes"
        defaultValue={reviewNotes}
        placeholder="Nota de revisión opcional"
      />
      <SubmitButton label="Guardar revisión" />
      <ActionMessage state={state} compact />
    </form>
  );
}

export function QuickAppointmentButton({ id }: { id: string }) {
  return (
    <QuickStatusForm
      id={id}
      status="confirmed"
      label="Confirmar y notificar"
      action={confirmAppointmentAndNotifyWithFeedback}
      icon="check"
    />
  );
}

export function QuickQuoteSentButton({ id }: { id: string }) {
  return (
    <QuickStatusForm
      id={id}
      status="sent"
      label="Enviar por WhatsApp"
      action={sendQuoteAndNotifyWithFeedback}
      icon="send"
    />
  );
}

export function QuickQuoteAcceptedButton({ id }: { id: string }) {
  return (
    <QuickStatusForm id={id} status="accepted" label="Marcar aceptada" action={updateQuoteStatusWithFeedback} icon="check" />
  );
}

function QuickStatusForm({
  id,
  status,
  label,
  action,
  icon,
}: {
  id: string;
  status: string;
  label: string;
  action: (_state: ActionState, formData: FormData) => Promise<ActionState>;
  icon: "check" | "send";
}) {
  const [state, formAction] = useActionState(action, null);
  const Icon = icon === "send" ? Send : Check;

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-black px-3 text-sm font-semibold text-white">
        <Icon size={15} />
        {label}
      </button>
      <ActionMessage state={state} compact />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-black px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
    >
      <Save size={15} />
      {pending ? "Guardando" : label}
    </button>
  );
}

export function ActionMessage({ state, compact }: { state: ActionState; compact?: boolean }) {
  if (!state) return null;

  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm ${
        compact ? "max-w-xs" : ""
      } ${
        state.status === "success"
          ? "border-[#93b35d]/40 bg-[#eef7d2] text-[#3f551c]"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
      role="status"
    >
      {state.message}
    </p>
  );
}
