// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.stubGlobal("GM_getValue", (key: string, def: unknown) =>
  store.has(key) ? store.get(key)! : def,
);
vi.stubGlobal("GM_setValue", (key: string, value: string) => {
  store.set(key, value);
});
vi.stubGlobal("GM_deleteValue", (key: string) => {
  store.delete(key);
});

describe("getBaseUrl", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
  });

  it("returns the default when unset", async () => {
    const { DEFAULT_BASE_URL, getBaseUrl } = await import("./openai");
    expect(getBaseUrl()).toBe(DEFAULT_BASE_URL);
  });

  it("returns a stored https URL", async () => {
    const { getBaseUrl, setBaseUrl } = await import("./openai");
    setBaseUrl("https://llm.example.com/v1/");
    expect(getBaseUrl()).toBe("https://llm.example.com/v1");
  });

  it("clears stale evil URLs and falls back to default", async () => {
    store.set("fsp:sdk:base_url", "http://evil.example/v1");
    const { DEFAULT_BASE_URL, getBaseUrl } = await import("./openai");
    expect(getBaseUrl()).toBe(DEFAULT_BASE_URL);
    expect(store.has("fsp:sdk:base_url")).toBe(false);
  });
});
