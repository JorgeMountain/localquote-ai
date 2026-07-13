import { processChatMessage } from "@/lib/chat-service";
import { claimWhatsAppOutbox, finishWhatsAppOutbox } from "@/lib/chat-store";
import { createAnonRouteClient } from "@/lib/supabase/route";
import { sendWhatsAppText } from "@/lib/whatsapp";

export type WhatsAppOutboxBatchResult = {
  processed: number;
  sent: number;
  retried: number;
  failed: number;
};

export async function processWhatsAppOutboxBatch(limit = 1): Promise<WhatsAppOutboxBatchResult> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 10);
  const result: WhatsAppOutboxBatchResult = { processed: 0, sent: 0, retried: 0, failed: 0 };
  const supabase = createAnonRouteClient();

  for (let jobIndex = 0; jobIndex < safeLimit; jobIndex += 1) {
    const job = await claimWhatsAppOutbox(supabase);
    if (!job) break;
    result.processed += 1;

    try {
      const reply = await buildOutboxReply(job);
      const delivery = await sendWhatsAppText(job.customerPhone, reply.body, reply.sourcePhoneNumberId);
      const outcome = await finishWhatsAppOutbox(supabase, {
        outboxId: job.id,
        succeeded: true,
        providerMessageId: delivery.providerMessageId,
      });

      if (outcome.status === "sent") result.sent += 1;
    } catch {
      const outcome = await finishWhatsAppOutbox(supabase, {
        outboxId: job.id,
        succeeded: false,
        errorCode: "processing_failed",
      });
      if (outcome.retryScheduled) {
        result.retried += 1;
      } else {
        result.failed += 1;
      }
      console.error("WhatsApp outbox job failed.", {
        outboxId: job.id,
        businessId: job.businessId,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        retryScheduled: outcome.retryScheduled,
      });
    }
  }

  return result;
}

async function buildOutboxReply(job: {
  customerName?: string;
  customerPhone: string;
  incomingMessage: string;
  messageType: string;
  sourcePhoneNumberId: string;
}) {
  if (job.messageType !== "text" || !job.incomingMessage.trim()) {
    return {
      body: "Por ahora solo puedo responder mensajes de texto. Envianos tu pregunta por escrito y con gusto te ayudamos.",
      sourcePhoneNumberId: job.sourcePhoneNumberId,
    };
  }

  const response = await processChatMessage({
    channel: "whatsapp",
    phoneNumberId: job.sourcePhoneNumberId,
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    message: job.incomingMessage,
  });

  if (!response) throw new Error("whatsapp_business_not_found");
  return {
    body: response.reply,
    sourcePhoneNumberId: response.responsePhoneNumberId ?? job.sourcePhoneNumberId,
  };
}
