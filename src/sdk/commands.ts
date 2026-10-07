// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { AgentEvent } from "./types";
import {
  getBaseUrl,
  setBaseUrl,
  getApiKey,
  setApiKey,
  getModel,
  setModel,
  fetchModels,
} from "./openai";
import { t } from "../i18n.svelte";

export interface CommandResult {
  handled: boolean;
  events: AgentEvent[];
  clearChat?: boolean;
}

const HELP_TEXT = (): string => t("chat.help");

export async function handleCommand(input: string): Promise<CommandResult> {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) {
    return { handled: false, events: [] };
  }

  const [command, ...rest] = trimmed.split(/\s+/);
  const arg = rest.join(" ");
  const cmd = command.toLowerCase();

  switch (cmd) {
    case "/help": {
      return {
        handled: true,
        events: [{ type: "message", content: HELP_TEXT(), role: "assistant" }],
      };
    }

    case "/key": {
      if (!arg) {
        const current = getApiKey();
        const masked = current
          ? `${current.slice(0, 4)}...${current.slice(-4)}`
          : "";
        return {
          handled: true,
          events: [
            {
              type: "message",
              content: current
                ? t("chat.apiKeySet", { masked })
                : t("chat.apiKeyMissing"),
              role: "assistant",
            },
          ],
        };
      }
      setApiKey(arg);
      return {
        handled: true,
        events: [
          {
            type: "message",
            content: t("chat.apiKeySaved"),
            role: "assistant",
          },
        ],
      };
    }

    case "/url": {
      if (!arg) {
        return {
          handled: true,
          events: [
            {
              type: "message",
              content: t("chat.baseUrlCurrent", { url: getBaseUrl() }),
              role: "assistant",
            },
          ],
        };
      }
      setBaseUrl(arg);
      return {
        handled: true,
        events: [
          {
            type: "message",
            content: t("chat.baseUrlSet", { url: arg }),
            role: "assistant",
          },
        ],
      };
    }

    case "/model": {
      if (!arg) {
        return {
          handled: true,
          events: [
            {
              type: "message",
              content: t("chat.modelCurrent", { model: getModel() }),
              role: "assistant",
            },
          ],
        };
      }
      setModel(arg);
      return {
        handled: true,
        events: [
          {
            type: "message",
            content: t("chat.modelSet", { model: arg }),
            role: "assistant",
          },
        ],
      };
    }

    case "/models": {
      try {
        const models = await fetchModels();
        if (models.length === 0) {
          return {
            handled: true,
            events: [
              {
                type: "message",
                content: t("chat.noModels"),
                role: "assistant",
              },
            ],
          };
        }
        const current = getModel();
        const list = models
          .map((m) => `${m.id === current ? "● " : "  "}${m.id}`)
          .join("\n");
        return {
          handled: true,
          events: [
            {
              type: "message",
              content: t("chat.modelsList", { list }),
              role: "assistant",
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          handled: true,
          events: [
            {
              type: "error",
              content: t("chat.modelsFailed", { message }),
              role: "assistant",
            },
          ],
        };
      }
    }

    case "/clear": {
      return {
        handled: true,
        events: [
          { type: "message", content: t("chat.cleared"), role: "assistant" },
        ],
        clearChat: true,
      };
    }

    default: {
      return {
        handled: true,
        events: [
          {
            type: "message",
            content: t("chat.unknownCommand", {
              cmd,
              help: t("chat.help"),
            }),
            role: "assistant",
          },
        ],
      };
    }
  }
}
