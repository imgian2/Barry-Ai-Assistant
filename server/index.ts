import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import type { ErrorRequestHandler } from "express";
import OpenAI from "openai";

dotenv.config();

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

const app = express();
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
const model = process.env.OPENAI_MODEL ?? "gpt-4.1";
const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const handleJsonParseError: ErrorRequestHandler = (
  error,
  _request,
  response,
  next
) => {
  if ((error as { type?: unknown })?.type === "entity.parse.failed") {
    response.status(400).json({
      code: "invalid_json",
      error: "Request body must be valid JSON.",
    });
    return;
  }

  next(error);
};

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(handleJsonParseError);

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    mode: client ? "live" : "configuration_error",
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
    response.status(503).json({
      code: "missing_openai_api_key",
      error:
        "OPENAI_API_KEY is not configured. Add it to .env or the host environment, then restart the Barry server.",
      model,
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
    response.status(getHttpStatus(error)).json({
      code: "openai_request_failed",
      error: getErrorMessage(error),
      model,
    });
  }
});

app.all("/api/chat", (request, response) => {
  response
    .set("Allow", "POST")
    .status(405)
    .json({
      code: "method_not_allowed",
      error: `Method ${request.method} is not allowed for /api/chat. Use POST with a JSON body.`,
    });
});

app.use("/api", (request, response) => {
  response.status(404).json({
    code: "api_route_not_found",
    error: `No API route found for ${request.method} ${request.originalUrl}.`,
  });
});

const staticDir = path.resolve(process.cwd(), "dist");
const staticIndex = path.join(staticDir, "index.html");

if (existsSync(staticIndex)) {
  app.use(express.static(staticDir));
  app.get("*", (_request, response) => {
    response.sendFile(staticIndex);
  });
}

app.listen(port, host, () => {
  console.log(`Barry server listening on http://${host}:${port}`);
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

function getHttpStatus(error: unknown) {
  const status =
    (error as { status?: unknown })?.status ??
    (error as { statusCode?: unknown })?.statusCode;

  return typeof status === "number" && status >= 400 && status <= 599
    ? status
    : 502;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return `OpenAI request failed: ${error.message}`;
  }

  return "OpenAI request failed for an unknown reason. Check the Barry server logs.";
}
