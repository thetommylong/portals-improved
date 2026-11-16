// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { notify } from "./notifications";

let offlineToastShown = false;
let listening = false;

function ensureOnlineReset(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("online", () => {
    offlineToastShown = false;
  });
}

/** Auth/session failures — reauth banner owns these; never treat as offline. */
export function isAuthFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Auth token expired|No auth token found|\bHTTP 401\b|\bHTTP 403\b/i.test(
    msg,
  );
}

/** Transport / connectivity failures (not auth). */
export function isOfflineFailure(err: unknown): boolean {
  if (isAuthFailure(err)) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /Network error|Request timed out|Failed to fetch|net::ERR_|ERR_INTERNET|ERR_CONNECTION/i.test(
    msg,
  );
}

/**
 * Show the offline toast at most once until the browser goes online again.
 */
export function notifyOfflineOnce(message: string): void {
  ensureOnlineReset();
  if (offlineToastShown) return;
  offlineToastShown = true;
  notify(message, "info");
}

/** @internal tests */
export function resetOfflineToastForTests(): void {
  offlineToastShown = false;
}

/**
 * Shared load-failure path for views + poller.
 * Auth → silent (banner). Offline / stale cache → one offline toast.
 * Hard fail with no cache → error toast.
 */
export function noteFetchFailure(
  err: unknown,
  opts: {
    hasCache: boolean;
    failMessage: string;
    offlineMessage: string;
  },
): void {
  if (isAuthFailure(err)) return;
  if (isOfflineFailure(err) || opts.hasCache) {
    notifyOfflineOnce(opts.offlineMessage);
    return;
  }
  notify(opts.failMessage, "error");
}
