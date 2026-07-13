import { NextResponse } from "next/server";
import { processChatMessage } from "@/lib/chat-service";
import { parseChatRequestBody } from "@/lib/chat-request";
import { consumeInternalRateLimit } from "@/lib/chat-store";
import { createAnonRouteClient } from "@/lib/supabase/route";

const maxRequestBytes = 32 * 1024;
const maxMessageLength = 2000;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > maxRequestBytes) {
    return NextResponse.json({ error: "La solicitud es demasiado grande." }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > maxRequestBytes) {
    return NextResponse.json({ error: "La solicitud es demasiado grande." }, { status: 413 });
  }

  const parsed = parseChatRequestBody(rawBody, maxMessageLength);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { payload } = parsed;
  const { slug, message } = payload;

  try {
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientIp = forwardedFor || request.headers.get("x-real-ip") || "unknown";
    const allowed = await consumeInternalRateLimit(
      createAnonRouteClient(),
      `web-chat:${clientIp.slice(0, 64)}:${slug}`,
      20,
      60,
    );

    if (!allowed) {
      return NextResponse.json(
        { error: "Has enviado demasiados mensajes. Espera un minuto e intenta nuevamente." },
        { status: 429 },
      );
    }

    const response = await processChatMessage({
      channel: "web",
      slug,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      message,
      customerId: payload.customerId,
      conversationId: payload.conversationId,
    });

    if (!response) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json(response);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "No se pudo procesar el mensaje.";
    const status = messageText.includes("Invalid chat session") ? 403 : 500;
    if (status === 500) console.error("Web chat processing failed.", error);
    return NextResponse.json(
      { error: status === 403 ? "La sesion de chat no es valida." : "No se pudo procesar el mensaje." },
      { status },
    );
  }
}
