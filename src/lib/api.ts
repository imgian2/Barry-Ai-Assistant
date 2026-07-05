import { ChatMessage } from "@/lib/types";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/api";

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  mode: "live" | "demo";
  model: string;
}

export async function sendChatMessage(payload: ChatRequest) {
  const response = await fetch(`${apiBase}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Barry API failed with ${response.status}`);
  }

  return (await response.json()) as ChatResponse;
}

