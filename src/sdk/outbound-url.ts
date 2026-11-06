// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Default OpenAI-compatible base URL (also the host that skips /url confirm). */
export const DEFAULT_LLM_BASE_URL = "https://api.openai.com/v1";

/** Error thrown when a configurable outbound URL fails the HTTPS/loopback policy. */
export class OutboundUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutboundUrlError";
  }
}

function isLoopbackHost(hostname: string): boolean {
  // URL.hostname may keep brackets for IPv6 (e.g. "[::1]") depending on runtime.
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }
  return host.endsWith(".localhost");
}

/**
 * Harden configurable outbound URLs (LLM base URL, etc.).
 * Allows `https:` always; `http:` only for localhost / loopback; rejects other schemes.
 * Returns the URL with trailing slashes stripped.
 */
export function validateOutboundUrl(raw: string): string {
  const trimmed = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new OutboundUrlError("Invalid URL");
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol === "https:") {
    return trimmed.replace(/\/+$/, "");
  }
  if (protocol === "http:") {
    if (!isLoopbackHost(parsed.hostname)) {
      throw new OutboundUrlError(
        "http: is only allowed for localhost/loopback hosts",
      );
    }
    return trimmed.replace(/\/+$/, "");
  }
  throw new OutboundUrlError(
    `Unsupported URL scheme: ${protocol.replace(/:$/, "")}`,
  );
}

/** True when the URL host differs from the default OpenAI host (confirm UX). */
export function needsNonDefaultHostConfirm(url: string): boolean {
  const parsed = new URL(url);
  const defaultHost = new URL(DEFAULT_LLM_BASE_URL).hostname.toLowerCase();
  return parsed.hostname.toLowerCase() !== defaultHost;
}
