import type { ChatRequest, ChatResponse } from "./types";

export interface MessagingProvider {
  channel: "web" | "whatsapp";
  receive(input: ChatRequest): Promise<ChatRequest>;
  send(output: ChatResponse): Promise<ChatResponse>;
}

export class WebChatProvider implements MessagingProvider {
  channel = "web" as const;

  async receive(input: ChatRequest) {
    return input;
  }

  async send(output: ChatResponse) {
    return output;
  }
}

export class WhatsAppProvider implements MessagingProvider {
  channel = "whatsapp" as const;

  async receive(): Promise<ChatRequest> {
    throw new Error("WhatsApp provider is intentionally not implemented in the MVP.");
  }

  async send(): Promise<ChatResponse> {
    throw new Error("Connect Twilio or WhatsApp Business API here.");
  }
}
