"use client";

import { Check, MessageCircleReply, Save } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  markConversationReadWithFeedback,
  saveConversationDetailsWithFeedback,
  sendManualReplyWithFeedback,
} from "@/app/server-actions/conversations";
import { ActionMessage } from "@/components/ActionForms";

export function MarkConversationReadButton({ conversationId }: { conversationId: string }) {
  const [state, formAction] = useActionState(markConversationReadWithFeedback, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="conversation_id" value={conversationId} />
      <button className="inline-flex h-9 items-center gap-2 rounded-md border border-black/15 px-3 text-sm font-semibold hover:bg-black hover:text-white">
        <Check size={15} />
        Marcar como leida
      </button>
      <ActionMessage state={state} />
    </form>
  );
}

export function ConversationMetaEditor({
  conversationId,
  internalNotes,
  tags,
}: {
  conversationId: string;
  internalNotes: string;
  tags: string[];
}) {
  const [state, formAction] = useActionState(saveConversationDetailsWithFeedback, null);

  return (
    <form action={formAction} className="rounded-md border border-black/10 bg-[#f8f6f1] p-4">
      <input type="hidden" name="conversation_id" value={conversationId} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Notas internas y etiquetas</h3>
          <p className="mt-1 text-sm text-[#706d62]">Solo las ve el equipo del negocio.</p>
        </div>
        <SubmitButton icon={Save} label="Guardar" />
      </div>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-2 text-sm font-semibold">
          Notas internas
          <textarea
            className="min-h-24 rounded-md border border-black/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-black"
            name="internal_notes"
            defaultValue={internalNotes}
            maxLength={2000}
            placeholder="Ej.: quiere que lo contacten despues de las 3 p. m."
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Etiquetas
          <input
            className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm font-normal outline-none focus:border-black"
            name="tags"
            defaultValue={tags.join(", ")}
            maxLength={500}
            placeholder="Ej.: urgente, ortodoncia, seguimiento"
          />
          <span className="text-xs font-normal text-[#706d62]">Separa cada etiqueta con una coma. Maximo 10.</span>
        </label>
      </div>
      <div className="mt-3"><ActionMessage state={state} /></div>
    </form>
  );
}

export function ManualReplyComposer({ conversationId, channel }: { conversationId: string; channel: "web" | "whatsapp" }) {
  const [state, formAction] = useActionState(sendManualReplyWithFeedback, null);
  const isWhatsApp = channel === "whatsapp";

  return (
    <form action={formAction} className="rounded-md border border-black/10 bg-white p-4">
      <input type="hidden" name="conversation_id" value={conversationId} />
      <div className="flex items-center gap-2">
        <MessageCircleReply size={18} />
        <div>
          <h3 className="font-semibold">Respuesta manual</h3>
          <p className="mt-1 text-sm text-[#706d62]">
            {isWhatsApp ? "Se enviara al WhatsApp del cliente y quedara en el historial." : "Quedara registrada en el historial interno del chat web."}
          </p>
        </div>
      </div>
      <textarea
        className="mt-4 min-h-24 w-full rounded-md border border-black/15 bg-[#f8f6f1] px-3 py-2 text-sm outline-none focus:border-black"
        name="body"
        maxLength={4000}
        required
        placeholder="Escribe una respuesta aprobada por el negocio..."
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <SubmitButton icon={MessageCircleReply} label={isWhatsApp ? "Enviar por WhatsApp" : "Guardar respuesta"} />
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function SubmitButton({ icon: Icon, label }: { icon: typeof Save; label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-md bg-black px-3 text-sm font-semibold text-white disabled:opacity-60"
      disabled={pending}
    >
      <Icon size={16} />
      {pending ? "Guardando..." : label}
    </button>
  );
}
