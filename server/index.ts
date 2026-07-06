import fs from "node:fs/promises";
import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import OpenAI from "openai";

dotenv.config();

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

const app = express();
const port = Number(process.env.PORT ?? 8787);
const model = process.env.OPENAI_MODEL ?? "gpt-4.1";
const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    mode: client ? "live" : "demo",
    model,
  });
});

app.post("/api/chat", async (request, response) => {
  const messages = normalizeMessages(request.body?.messages);
  const lastUserMessage =
    [...messages].reverse().find((message) => message.role === "user")?.content ??
    "";

  if (!lastUserMessage) {
    response.status(400).json({ error: "At least one user message is required." });
    return;
  }

  if (!client) {
    response.json({
      mode: "demo",
      model,
      message: createDemoResponse(lastUserMessage),
    });
    return;
  }

  try {
    const instructions = await readBarryPrompt();
    const result = await client.responses.create({
      model,
      instructions,
      input: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    response.json({
      mode: "live",
      model,
      message: extractOutputText(result),
    });
  } catch (error) {
    console.error("Barry API error", error);
    response.json({
      mode: "demo",
      model,
      message: createServerFallbackResponse(lastUserMessage),
    });
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Barry server listening on http://127.0.0.1:${port}`);
});

function normalizeMessages(value: unknown): IncomingMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((message): message is IncomingMessage => {
      if (!message || typeof message !== "object") return false;
      const candidate = message as Partial<IncomingMessage>;
      return (
        (candidate.role === "user" || candidate.role === "assistant") &&
        typeof candidate.content === "string" &&
        candidate.content.trim().length > 0
      );
    })
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .slice(-24);
}

async function readBarryPrompt() {
  const promptPath = path.resolve(process.cwd(), "prompts/barry-system.prompt.xml");
  return fs.readFile(promptPath, "utf8");
}

function extractOutputText(result: unknown) {
  const outputText = (result as { output_text?: string }).output_text;
  if (outputText?.trim()) return outputText.trim();

  const output = (result as { output?: Array<{ content?: unknown[] }> }).output;
  const textParts =
    output?.flatMap((item) =>
      (item.content ?? []).flatMap((content) => {
        if (
          content &&
          typeof content === "object" &&
          "text" in content &&
          typeof (content as { text?: unknown }).text === "string"
        ) {
          return [(content as { text: string }).text];
        }
        return [];
      })
    ) ?? [];

  return textParts.join("\n").trim() || "I could not extract a response.";
}

function createDemoResponse(prompt: string) {
  return [
    "Barry is wired up and running in demo mode.",
    "",
    "To switch me into live AI mode, set `OPENAI_API_KEY` in `.env`, optionally set `OPENAI_MODEL`, and restart `npm run dev`.",
    "",
    `I received your request: "${prompt}"`,
    "",
    "Fast default: I would clarify only if the next action is risky, irreversible, or needs private integration data.",
  ].join("\n");
}

function createServerFallbackResponse(prompt: string) {
  return [
    "Barry reached the local server, but the live OpenAI request did not complete.",
    "",
    `I received your request: "${prompt}"`,
    "",
    "Check `OPENAI_API_KEY`, `OPENAI_MODEL`, and the server logs. I am keeping the conversation moving in demo mode instead of dropping the chat.",
  ].join("\n");
}
