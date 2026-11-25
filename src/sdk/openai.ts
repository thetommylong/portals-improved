// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type {
  OpenAIRequest,
  OpenAIResponse,
  ModelsResponse,
  ModelInfo,
} from "./types";
import { deleteSecret, getSecret, setSecret } from "../secrets";
import { ApiHttpError } from "./apiHttpError";
import { DEFAULT_LLM_BASE_URL, validateOutboundUrl } from "./outbound-url";

export {
  OutboundUrlError,
  needsNonDefaultHostConfirm,
  validateOutboundUrl,
} from "./outbound-url";
export { ApiHttpError, apiErrorKind, apiErrorTitleKey } from "./apiHttpError";

const SECRET_KEYS = {
  baseUrl: "sdk:base_url",
  apiKey: "sdk:api_key",
  model: "sdk:model",
} as const;

export const DEFAULT_BASE_URL = DEFAULT_LLM_BASE_URL;
const DEFAULT_MODEL = "gpt-4o-mini";

/**
 * Real userscript managers expose `GM_info`. The demo site shim does not, so
 * OpenAI traffic can use page `fetch` (streaming + AbortSignal) there. Portal
 * FSP calls stay on `GM_xmlhttpRequest` in the live adapter.
 */
function useGmTransport(): boolean {
  return typeof GM_info !== "undefined";
}

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

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function requireApiKey(): string {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key configured. Use /key to set one.");
  return apiKey;
}

function gmRequest<T>(
  url: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<T> {
  const apiKey = requireApiKey();

  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method,
      url,
      headers: authHeaders(apiKey),
      data: body != null ? JSON.stringify(body) : undefined,
      responseType: "json",
      timeout: 60_000,
      onload(res) {
        if (res.status >= 200 && res.status < 300) {
          resolve(res.response as T);
        } else {
          reject(new ApiHttpError(res.status, res.response));
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

async function pageRequest<T>(
  url: string,
  method: "GET" | "POST",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const apiKey = requireApiKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(apiKey),
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: unknown = text;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) throw new ApiHttpError(res.status, parsed);
    return parsed as T;
  } catch (err) {
    if (err instanceof ApiHttpError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      if (signal?.aborted) throw err;
      throw new Error("Request timed out (60s)", { cause: err });
    }
    throw new Error(
      `Network error: ${err instanceof Error ? err.message : "unknown"}`,
      { cause: err },
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

function requestJson<T>(
  url: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<T> {
  return useGmTransport()
    ? gmRequest<T>(url, method, body)
    : pageRequest<T>(url, method, body);
}

export async function gmOpenAI(body: OpenAIRequest): Promise<OpenAIResponse> {
  const baseUrl = getBaseUrl();
  return requestJson<OpenAIResponse>(
    `${baseUrl}/chat/completions`,
    "POST",
    body,
  );
}

function consumeSseBuffer(
  buffer: string,
  extra: string,
  onChunk: (chunk: string) => void,
): string {
  buffer += extra;
  const parts = buffer.split("\n\n");
  buffer = parts.pop()!;
  for (const part of parts) {
    if (!part.startsWith("data: ")) continue;
    const data = part.slice(6);
    if (data === "[DONE]") continue;
    try {
      const json = JSON.parse(data) as {
        choices?: { delta?: { content?: string } }[];
      };
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) onChunk(delta);
    } catch {
      // Ignore parsing errors
    }
  }
  return buffer;
}

async function pageOpenAIStream(
  body: OpenAIRequest,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const baseUrl = getBaseUrl();
  const apiKey = requireApiKey();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  });
  if (!res.ok) {
    throw new ApiHttpError(res.status, await res.text());
  }
  if (!res.body) {
    throw new Error("Network error: empty stream body");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer = consumeSseBuffer(
      buffer,
      decoder.decode(value, { stream: true }),
      onChunk,
    );
  }
  if (buffer.trim()) {
    consumeSseBuffer(buffer, "\n\n", onChunk);
  }
}

/** Cumulative GM `responseText`: only feed newly appended bytes into the SSE parser. */
function gmOpenAIStreamCumulative(
  body: OpenAIRequest,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const baseUrl = getBaseUrl();
  const apiKey = requireApiKey();
  let seen = 0;
  let buffer = "";

  return new Promise<void>((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      url: `${baseUrl}/chat/completions`,
      headers: authHeaders(apiKey),
      data: JSON.stringify({ ...body, stream: true }),
      responseType: "text",
      onprogress: (res) => {
        const text = res.responseText ?? "";
        if (text.length <= seen) return;
        const extra = text.slice(seen);
        seen = text.length;
        buffer = consumeSseBuffer(buffer, extra, onChunk);
      },
      onload: (res) => {
        const text = res.responseText ?? "";
        if (text.length > seen) {
          buffer = consumeSseBuffer(buffer, text.slice(seen), onChunk);
        }
        if (buffer.trim()) {
          consumeSseBuffer(buffer, "\n\n", onChunk);
        }
        if (res.status >= 200 && res.status < 300) {
          resolve();
          return;
        }
        reject(new ApiHttpError(res.status, res.responseText));
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

export async function gmOpenAIStream(
  body: OpenAIRequest,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (useGmTransport()) {
    return gmOpenAIStreamCumulative(body, onChunk);
  }
  return pageOpenAIStream(body, onChunk, signal);
}

export async function fetchModels(): Promise<ModelInfo[]> {
  const baseUrl = getBaseUrl();
  const res = await requestJson<ModelsResponse>(`${baseUrl}/models`, "GET");
  return res.data ?? [];
}
