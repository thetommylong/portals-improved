// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.stubGlobal("GM_getValue", (key: string, def: unknown) =>
  store.has(key) ? store.get(key)! : def,
);
vi.stubGlobal("GM_setValue", (key: string, value: string) => {
  store.set(key, value);
});

function stubLocation(hostname: string, search = ""): void {
  vi.stubGlobal("window", {
    name: "",
    location: { hostname, search },
  });
}

/** Same pattern discovery uses — folder index.ts default-export classes. */
const adapterEntries = import.meta.glob("./*/index.ts");

describe("adapter resolve", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("GM_getValue", (key: string, def: unknown) =>
      store.has(key) ? store.get(key)! : def,
    );
    vi.stubGlobal("GM_setValue", (key: string, value: string) => {
      store.set(key, value);
    });
  });

  it("globs adapters/*/index.ts including mock", () => {
    expect(Object.keys(adapterEntries).sort()).toEqual([
      "./fsp/index.ts",
      "./mock/index.ts",
    ]);
  });

  it("resolves live adapter on matching host", async () => {
    stubLocation("fsp.fpt.edu.vn");
    const { resolveAdapter } = await import("./discovery");
    const adapter = resolveAdapter();
    expect(adapter.name).toBe("live");
    expect(adapter.hosts).toContain("fsp");
  });

  it("forces mock when GM portal:adapter is mock", async () => {
    stubLocation("fsp.fpt.edu.vn");
    store.set("portal:adapter", "mock");
    const { resolveAdapter } = await import("./discovery");
    expect(resolveAdapter().name).toBe("mock");
  });

  it("falls back to mock on non-portal host", async () => {
    stubLocation("www.example.com");
    const { resolveAdapter } = await import("./discovery");
    expect(resolveAdapter().name).toBe("mock");
  });

  it("skips mock folder from live match even on empty-host path", async () => {
    stubLocation("fsp.fpt.edu.vn");
    const { firstMatchingLive } = await import("./discovery");
    const live = firstMatchingLive();
    expect(live?.name).toBe("live");
    expect(live?.hosts).not.toEqual([]);
  });
});
