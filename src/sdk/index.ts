// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type {
  AgentContext,
  AgentEvent,
  ConfirmRequest,
  OpenAIMessage,
  ToolCall,
} from "./types";
import { gmOpenAI, gmOpenAIStream, getModel, isConfigured } from "./openai";
import { buildSystemPrompt } from "./system";
import { t } from "../i18n.svelte";
import {
  searchFunctions,
  getToolDefinitions,
  getAvailableToolNames,
} from "./registry";
import { executeFunction, MAX_TOOL_TURNS } from "./executor";
import { handleCommand } from "./commands";

export type { AgentEvent, AgentContext, ConfirmRequest };

const SEARCH_TOOL = "searchFunctions";

const SEARCH_DEFINITION = {
  type: "function" as const,
  function: {
    name: SEARCH_TOOL,
    description:
      "Search available portal functions by query. Returns top 5 matching functions with their parameter schemas. Call this first before calling any other function.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query describing what data you need",
        },
      },
      required: ["query"],
    },
  },
};

export interface AgentInstance {
  send(
    message: string,
    onEvent: (event: AgentEvent) => void,
    requestConfirmation?: (req: ConfirmRequest) => Promise<boolean>,
    onDelta?: (chunk: string) => void,
  ): Promise<void>;
  clear(): void;
}

export function createAgent(context: AgentContext): AgentInstance {
  let history: OpenAIMessage[] = [];
  const systemPrompt = buildSystemPrompt(context);

  function clear() {
    history = [];
  }

  async function send(
    message: string,
    onEvent: (event: AgentEvent) => void,
    requestConfirmation?: (req: ConfirmRequest) => Promise<boolean>,
    onDelta?: (chunk: string) => void,
  ): Promise<void> {
    const cmdResult = await handleCommand(message);
    if (cmdResult.handled) {
      for (const event of cmdResult.events) onEvent(event);
      if (cmdResult.clearChat) clear();
      return;
    }

    if (!isConfigured()) {
      onEvent({
        type: "error",
        content: "API not configured. Use /key <your-api-key> to set up.",
      });
      return;
    }

    history.push({ role: "user", content: message });

    let toolTurns = 0;

    while (toolTurns < MAX_TOOL_TURNS) {
      const shouldStream = !!onDelta && toolTurns === MAX_TOOL_TURNS - 1;

      if (!shouldStream) {
        onEvent({ type: "thinking" });
      }

      let response;
      try {
        if (shouldStream) {
          const streamedEvent: AgentEvent = {
            type: "message",
            role: "assistant",
            content: "",
          };
          onEvent(streamedEvent);

          let accumulated = "";
          await gmOpenAIStream(
            {
              model: getModel(),
              messages: [{ role: "system", content: systemPrompt }, ...history],
              temperature: 0.2,
            },
            (chunk) => {
              accumulated += chunk;
              streamedEvent.content = accumulated;
              onDelta?.(chunk);
            },
          );

          history.push({ role: "assistant", content: accumulated });
          onEvent({ type: "done" });
          return;
        }

        response = await gmOpenAI({
          model: getModel(),
          messages: [{ role: "system", content: systemPrompt }, ...history],
          tools:
            toolTurns < MAX_TOOL_TURNS - 1
              ? [
                  SEARCH_TOOL_DEFINITION,
                  ...getToolDefinitions(getAvailableToolNames()),
                ]
              : undefined,
          temperature: 0.2,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onEvent({ type: "error", content: msg });
        history.push({
          role: "assistant",
          content: `[System error: ${msg}]`,
        });
        return;
      }

      const choice = response.choices?.[0];
      if (!choice) {
        onEvent({ type: "error", content: t("chat.noResponse") });
        return;
      }

      const assistantMsg = choice.message;
      history.push({
        role: "assistant",
        content: assistantMsg.content,
        tool_calls: assistantMsg.tool_calls,
      });

      if (assistantMsg.content) {
        onEvent({
          type: "message",
          content: assistantMsg.content,
          role: "assistant",
        });
      }

      const toolCalls = assistantMsg.tool_calls;
      if (
        !toolCalls ||
        toolCalls.length === 0 ||
        choice.finish_reason === "stop"
      ) {
        onEvent({ type: "done" });
        return;
      }

      for (const tc of toolCalls) {
        toolTurns++;
        const result = await processToolCall(tc, onEvent, requestConfirmation);
        history.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
    }

    onEvent({ type: "done" });
  }

  return { send, clear };
}

const SEARCH_TOOL_DEFINITION = SEARCH_DEFINITION;

async function processToolCall(
  tc: ToolCall,
  onEvent: (event: AgentEvent) => void,
  requestConfirmation?: (req: ConfirmRequest) => Promise<boolean>,
): Promise<string> {
  const name = tc.function.name;
  let args: Record<string, unknown>;

  try {
    args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
  } catch {
    const msg = `Invalid JSON arguments for ${name}`;
    onEvent({ type: "error", content: msg });
    return msg;
  }

  if (name === SEARCH_TOOL) {
    const query = (args.query as string) ?? "";
    const results = searchFunctions(query);
    onEvent({
      type: "tool_call",
      toolName: SEARCH_TOOL,
      toolArgs: { query },
    });
    const text =
      results.length === 0
        ? `No tools match: "${query}". Available categories: terms, feedback, homework, courses, marks, classes, clubs, events, discipline, rewards, dormitory, surveys, notifications, users, schedule, campus.`
        : results
            .map(
              (t) =>
                `${t.name} — ${t.category}${t.read ? "" : " [MUTATION]"} — ${t.description} [${t.params.map((p) => `${p.name}: ${p.type}${p.required ? "" : "?"}`).join(", ")}]`,
            )
            .join("\n");
    onEvent({ type: "tool_result", toolName: SEARCH_TOOL, content: text });
    return text;
  }

  onEvent({ type: "tool_call", toolName: name, toolArgs: args });

  const result = await executeFunction(name, args, requestConfirmation);

  onEvent({
    type: "tool_result",
    toolName: name,
    content: result.content,
    ...(result.error ? { error: true } : {}),
  });

  return result.content;
}
