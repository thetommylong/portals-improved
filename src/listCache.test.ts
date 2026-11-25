// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cacheKey,
  LIST_CACHE_TTL_MS,
  readListCache,
  writeListCache,
} from "./listCache";

const mem = new Map<string, string>();

describe("listCache", () => {
  beforeEach(() => {
    mem.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
    });
  });

  it("round-trips and expires", () => {
    const key = cacheKey("events", "s1", "t1");
    expect(key).toBe("pi:cache:events:s1:t1");
    writeListCache(key, [{ id: 1 }]);
    expect(readListCache(key)).toEqual([{ id: 1 }]);

    const raw = JSON.parse(mem.get(key)!) as { savedAt: number; data: unknown };
    raw.savedAt = Date.now() - LIST_CACHE_TTL_MS - 1;
    mem.set(key, JSON.stringify(raw));
    expect(readListCache(key)).toBeNull();
    expect(mem.has(key)).toBe(false);
  });
});
