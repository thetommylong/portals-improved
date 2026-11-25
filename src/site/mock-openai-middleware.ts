// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { Connect, Plugin } from "vite";

const MOCK_MODEL = "mock-gpt";

function readJson(
  req: Connect.IncomingMessage,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function lastUserText(body: Record<string, unknown>): string {
  const messages = body.messages;
  if (!Array.isArray(messages)) return "hello";
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as { role?: string; content?: unknown };
    if (
      m?.role === "user" &&
      typeof m.content === "string" &&
      m.content.trim()
    ) {
      return m.content.trim();
    }
  }
  return "hello";
}

function replyFor(prompt: string): string {
  const clipped = prompt.length > 120 ? `${prompt.slice(0, 117)}…` : prompt;
  return `Mock assistant here. You said: “${clipped}”`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Same-origin OpenAI-compatible stub for `pnpm site:dev` so chat/fetch can be
 * exercised without a real provider (and so the thinking bubble is visible).
 */
export function mockOpenAIMiddleware(): Plugin {
  return {
    name: "mock-openai",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        const path = url.split("?")[0] ?? "";
        if (!path.startsWith("/v1/")) {
          next();
          return;
        }

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Authorization, Content-Type",
        );
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === "GET" && path === "/v1/models") {
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              data: [{ id: MOCK_MODEL, owned_by: "portals-improved-mock" }],
            }),
          );
          return;
        }

        if (req.method === "POST" && path === "/v1/chat/completions") {
          let body: Record<string, unknown>;
          try {
            body = await readJson(req);
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: { message: "Invalid JSON" } }));
            return;
          }

          const text = replyFor(lastUserText(body));
          // Pause so the UI thinking bubble is noticeable before tokens arrive.
          await sleep(700);

          if (body.stream) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache");
            const id = `chatcmpl-mock-${Date.now()}`;
            for (const ch of text) {
              const chunk = {
                id,
                object: "chat.completion.chunk",
                choices: [
                  { index: 0, delta: { content: ch }, finish_reason: null },
                ],
              };
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              await sleep(18);
            }
            res.write("data: [DONE]\n\n");
            res.end();
            return;
          }

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              id: `chatcmpl-mock-${Date.now()}`,
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: text },
                  finish_reason: "stop",
                },
              ],
            }),
          );
          return;
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ error: { message: `No mock for ${path}` } }));
      });
    },
  };
}
