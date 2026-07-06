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
  try {
    const response = await fetch(`${apiBase}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return createLocalFallbackResponse(payload, `HTTP ${response.status}`);
    }

    return (await response.json()) as ChatResponse;
  } catch (error) {
    return createLocalFallbackResponse(
      payload,
      error instanceof Error ? error.message : "network unavailable"
    );
  }
}

function createLocalFallbackResponse(
  payload: ChatRequest,
  reason: string
): ChatResponse {
  const lastUserMessage =
    [...payload.messages].reverse().find((message) => message.role === "user")
      ?.content ?? "your request";

  return {
    mode: "demo",
    model: "local-fallback",
    message: [
      "I am running in local fallback mode because the Barry API server is not reachable right now.",
      "",
      `Received: "${lastUserMessage}"`,
      "",
      "Fast fix: start the full app with `npm run dev` so the Vite client and Barry API server run together. If you want live AI responses, set `OPENAI_API_KEY` in `.env` and restart.",
      "",
      `Technical detail: ${reason}.`,
    ].join("\n"),
  };
}
