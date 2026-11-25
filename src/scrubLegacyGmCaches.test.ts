// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();

describe("scrubLegacyGmCaches", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
    vi.stubGlobal("GM_getValue", (key: string, def: unknown) =>
      store.has(key) ? store.get(key) : def,
    );
    vi.stubGlobal("GM_setValue", (key: string, val: unknown) => {
      store.set(key, val);
    });
    vi.stubGlobal("GM_deleteValue", (key: string) => {
      store.delete(key);
    });
    vi.stubGlobal("GM_listValues", () => [...store.keys()]);
  });

  it("deletes legacy cache keys once", async () => {
    store.set("fsp:cal:s1:w1", { savedAt: 1, entries: [] });
    store.set("fsp:marks:s1:t1", { savedAt: 1, marks: [] });
    store.set("flavor", "mocha");
    const { scrubLegacyGmCaches } = await import("./scrubLegacyGmCaches");
    scrubLegacyGmCaches();
    expect(store.has("fsp:cal:s1:w1")).toBe(false);
    expect(store.has("fsp:marks:s1:t1")).toBe(false);
    expect(store.get("flavor")).toBe("mocha");
    expect(store.get("scrubbed-gm-caches-v1")).toBe(true);

    store.set("fsp:cal:s1:w2", { savedAt: 1, entries: [] });
    scrubLegacyGmCaches();
    expect(store.has("fsp:cal:s1:w2")).toBe(true);
  });
});
