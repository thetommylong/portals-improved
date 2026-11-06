// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type {
  OpenAIRequest,
  OpenAIResponse,
  ModelsResponse,
  ModelInfo,
} from "./types";
import { deleteSecret, getSecret, setSecret } from "../secrets";
import { DEFAULT_LLM_BASE_URL, validateOutboundUrl } from "./outbound-url";

export {
  OutboundUrlError,
  needsNonDefaultHostConfirm,
  validateOutboundUrl,
} from "./outbound-url";

const SECRET_KEYS = {
  baseUrl: "sdk:base_url",
  apiKey: "sdk:api_key",
  model: "sdk:model",
} as const;

export const DEFAULT_BASE_URL = DEFAULT_LLM_BASE_URL;
const DEFAULT_MODEL = "gpt-4o-mini";

export function getBaseUrl(): string {
  const stored = getSecret(SECRET_KEYS.baseUrl);
  if (!stored) return DEFAULT_BASE_URL;
  try {
    return validateOutboundUrl(stored);
  } catch {
    // Stale / pre-policy secrets must not bypass the scheme policy on read.
    deleteSecret(SECRET_KEYS.baseUrl);
    return DEFAULT_BASE_URL;
  }
}

export function setBaseUrl(url: string): void {
  setSecret(SECRET_KEYS.baseUrl, validateOutboundUrl(url));
}

export function getApiKey(): string | null {
  return getSecret(SECRET_KEYS.apiKey);
}

export function setApiKey(key: string): void {
  setSecret(SECRET_KEYS.apiKey, key);
}

export function getModel(): string {
  return getSecret(SECRET_KEYS.model) ?? DEFAULT_MODEL;
}

export function setModel(modelId: string): void {
  setSecret(SECRET_KEYS.model, modelId);
}

export function isConfigured(): boolean {
  return !!getApiKey();
}

function gmRequest<T>(
  url: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key configured. Use /key to set one.");

  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method,
      url,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: body != null ? JSON.stringify(body) : undefined,
      responseType: "json",
      timeout: 60_000,
      onload(res) {
        if (res.status >= 200 && res.status < 300) {
          resolve(res.response as T);
        } else {
          const detail =
            typeof res.response === "string"
              ? res.response
              : JSON.stringify(res.response);
          reject(new Error(`API ${res.status}: ${detail}`));
        }
      },
      onerror(err) {
        reject(new Error(`Network error: ${err.statusText || "unknown"}`));
      },
      ontimeout() {
        reject(new Error("Request timed out (60s)"));
      },
    });
  });
}

export async function gmOpenAI(body: OpenAIRequest): Promise<OpenAIResponse> {
  const baseUrl = getBaseUrl();
  return gmRequest<OpenAIResponse>(`${baseUrl}/chat/completions`, "POST", body);
}

export async function gmOpenAIStream(
  body: OpenAIRequest,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No API key configured. Use /key to set one.");
  }

  let buffer = "";

  function consume(extra: string): void {
    buffer += extra;
    const parts = buffer.split("\n\n");
    buffer = parts.pop()!;
    for (const part of parts) {
      if (part.startsWith("data: ")) {
        const data = part.slice(6);
        if (data === "[DONE]") {
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            onChunk(delta);
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }
  }

  return new Promise<void>((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      url: `${baseUrl}/chat/completions`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ ...body, stream: true }),
      responseType: "text",
      onprogress: (res) => {
        consume(res.responseText);
      },
      onload: () => {
        resolve();
      },
      onerror: (err) => {
        reject(new Error(`Network error: ${err.statusText || "unknown"}`));
      },
      ontimeout: () => {
        reject(new Error("Request timed out (60s)"));
      },
    });
  });
}

export async function fetchModels(): Promise<ModelInfo[]> {
  const baseUrl = getBaseUrl();
  const res = await gmRequest<ModelsResponse>(`${baseUrl}/models`, "GET");
  return res.data ?? [];
}
