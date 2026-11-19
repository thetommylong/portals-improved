// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Default: 1s base, 32s cap, full jitter — AWS-style. */
export const RATE_LIMIT_BASE_MS = 1_000;
export const RATE_LIMIT_MAX_MS = 32_000;
/** Total chat/completions attempts including the first (failed) call. */
export const RATE_LIMIT_MAX_ATTEMPTS = 6;

/**
 * Full-jitter delay before retry `retryIndex` (0 = first retry after a 429).
 * `random` is injectable for tests (0..1).
 */
export function backoffDelayMs(
  retryIndex: number,
  opts?: {
    baseMs?: number;
    maxMs?: number;
    random?: () => number;
  },
): number {
  const base = opts?.baseMs ?? RATE_LIMIT_BASE_MS;
  const max = opts?.maxMs ?? RATE_LIMIT_MAX_MS;
  const rnd = opts?.random ?? Math.random;
  const exp = Math.min(max, base * 2 ** Math.max(0, retryIndex));
  return Math.floor(rnd() * (exp + 1));
}

/** Resolves after `ms`, or rejects with AbortError if `signal` aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}
