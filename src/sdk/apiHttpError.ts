// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Structured OpenAI-compatible HTTP failure from gmRequest / fetchModels. */
export class ApiHttpError extends Error {
  readonly status: number;
  readonly apiCode: string | null;
  readonly apiMessage: string;

  constructor(status: number, body: unknown) {
    const { apiCode, apiMessage } = parseApiErrorBody(body);
    super(formatApiHttpErrorLine(status, apiMessage));
    this.name = "ApiHttpError";
    this.status = status;
    this.apiCode = apiCode;
    this.apiMessage = apiMessage;
  }
}

export type ApiErrorKind =
  | "auth"
  | "forbidden"
  | "not_found"
  | "rate_limit"
  | "teapot"
  | "server"
  | "other";

export function apiErrorKind(status: number): ApiErrorKind {
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 418) return "teapot";
  if (status === 429) return "rate_limit";
  if (status >= 500 && status <= 599) return "server";
  return "other";
}

/** Flat i18n keys for API error titles (must exist in en/vi.json). */
export type ApiErrorTitleKey =
  | "chat.apiErrorTitle.auth"
  | "chat.apiErrorTitle.forbidden"
  | "chat.apiErrorTitle.notFound"
  | "chat.apiErrorTitle.rateLimit"
  | "chat.apiErrorTitle.teapot"
  | "chat.apiErrorTitle.server"
  | "chat.apiErrorTitle.other";

export function apiErrorTitleKey(status: number): ApiErrorTitleKey {
  switch (apiErrorKind(status)) {
    case "auth":
      return "chat.apiErrorTitle.auth";
    case "forbidden":
      return "chat.apiErrorTitle.forbidden";
    case "not_found":
      return "chat.apiErrorTitle.notFound";
    case "rate_limit":
      return "chat.apiErrorTitle.rateLimit";
    case "teapot":
      return "chat.apiErrorTitle.teapot";
    case "server":
      return "chat.apiErrorTitle.server";
    default:
      return "chat.apiErrorTitle.other";
  }
}

export function parseApiErrorBody(body: unknown): {
  apiCode: string | null;
  apiMessage: string;
} {
  if (body == null) {
    return { apiCode: null, apiMessage: "" };
  }
  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed) return { apiCode: null, apiMessage: "" };
    try {
      return parseApiErrorBody(JSON.parse(trimmed) as unknown);
    } catch {
      return { apiCode: null, apiMessage: trimmed };
    }
  }
  if (typeof body !== "object") {
    return { apiCode: null, apiMessage: String(body) };
  }
  const root = body as Record<string, unknown>;
  const err =
    root.error && typeof root.error === "object"
      ? (root.error as Record<string, unknown>)
      : root;
  const apiMessage =
    typeof err.message === "string"
      ? err.message
      : typeof root.message === "string"
        ? root.message
        : JSON.stringify(body);
  const codeRaw = err.code ?? root.code;
  const apiCode =
    typeof codeRaw === "string" || typeof codeRaw === "number"
      ? String(codeRaw)
      : null;
  return { apiCode, apiMessage };
}

export function formatApiHttpErrorLine(
  status: number,
  apiMessage: string,
): string {
  const msg = apiMessage.trim();
  return msg ? `API ${status}: ${msg}` : `API ${status}`;
}
