// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { getJson, pageCacheKey, removeJson, setJson } from "./pageCache";

/** Shared page JSON cache for portal list views (events, homeworks, …). */

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
  const raw = getJson<ListCacheEnvelope<T>>(key, null);
  if (!raw) return null;
  if (Date.now() - raw.savedAt > ttlMs) {
    removeJson(key);
    return null;
  }
  return raw.data;
}

export function writeListCache<T>(key: string, data: T): void {
  setJson(key, {
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
    ? pageCacheKey(kind, studentOrUserId, extra)
    : pageCacheKey(kind, studentOrUserId);
}
