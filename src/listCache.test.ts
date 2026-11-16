// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cacheKey,
  LIST_CACHE_TTL_MS,
  readListCache,
  writeListCache,
} from "./listCache";

const store = new Map<string, unknown>();

describe("listCache", () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("GM_getValue", (key: string, def: unknown) =>
      store.has(key) ? store.get(key) : def,
    );
    vi.stubGlobal("GM_setValue", (key: string, val: unknown) => {
      store.set(key, val);
    });
    vi.stubGlobal("GM_deleteValue", (key: string) => {
      store.delete(key);
    });
  });

  it("round-trips and expires", () => {
    const key = cacheKey("events", "s1", "t1");
    expect(key).toBe("fsp:events:s1:t1");
    writeListCache(key, [{ id: 1 }]);
    expect(readListCache(key)).toEqual([{ id: 1 }]);

    const raw = store.get(key) as { savedAt: number; data: unknown };
    raw.savedAt = Date.now() - LIST_CACHE_TTL_MS - 1;
    expect(readListCache(key)).toBeNull();
    expect(store.has(key)).toBe(false);
  });
});
