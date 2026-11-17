// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Shared GM JSON cache for portal list views (events, homeworks, …). */

export interface ListCacheEnvelope<T> {
  savedAt: number;
  data: T;
}

/** Default TTL: 24 hours. */
export const LIST_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function readListCache<T>(
  key: string,
  ttlMs: number = LIST_CACHE_TTL_MS,
): T | null {
  const raw = GM_getValue<ListCacheEnvelope<T> | null>(key, null);
  if (!raw) return null;
  if (Date.now() - raw.savedAt > ttlMs) {
    GM_deleteValue(key);
    return null;
  }
  return raw.data;
}

export function writeListCache<T>(key: string, data: T): void {
  GM_setValue(key, {
    savedAt: Date.now(),
    data,
  } satisfies ListCacheEnvelope<T>);
}

export function cacheKey(
  kind: string,
  studentOrUserId: string,
  extra = "",
): string {
  return extra
    ? `fsp:${kind}:${studentOrUserId}:${extra}`
    : `fsp:${kind}:${studentOrUserId}`;
}
