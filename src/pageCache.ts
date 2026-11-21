// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Page-origin JSON cache (localStorage). Not for secrets — use GM / secrets.ts. */

const NS = "pi:cache:";

export function pageCacheKey(kind: string, ...parts: string[]): string {
  return `${NS}${[kind, ...parts].join(":")}`;
}

export function getJson<T>(key: string, fallback: T | null = null): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Fail soft on quota / private mode — next fetch refills. */
export function setJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* QuotaExceededError or SecurityError */
  }
}

export function removeJson(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
