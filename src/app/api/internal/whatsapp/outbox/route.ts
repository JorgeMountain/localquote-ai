import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { processWhatsAppOutboxBatch } from "@/lib/whatsapp-outbox";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasInternalAuthorization(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "5");
  const result = await processWhatsAppOutboxBatch(limit);
  return NextResponse.json(result);
}

function hasInternalAuthorization(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expectedTokens = [process.env.CRON_SECRET, process.env.INTERNAL_API_TOKEN].filter(
    (token): token is string => Boolean(token && token.length >= 24),
  );

  return expectedTokens.some((token) => compareTokens(bearerToken, token));
}

function compareTokens(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}
