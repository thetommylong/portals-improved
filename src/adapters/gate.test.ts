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
    location: { hostname, search },
  });
}

describe("gate", () => {
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

  it("stays idle on non-portal hosts without mock", async () => {
    stubLocation("www.tiktok.com");
    const { shouldBoot, hasLiveAdapter, isMockForced } = await import("./gate");
    expect(hasLiveAdapter()).toBe(false);
    expect(isMockForced()).toBe(false);
    expect(shouldBoot()).toBe(false);
  });

  it("boots on live portal hosts", async () => {
    stubLocation("fsp.fpt.edu.vn");
    const { shouldBoot, hasLiveAdapter } = await import("./gate");
    expect(hasLiveAdapter()).toBe(true);
    expect(shouldBoot()).toBe(true);
  });

  it("boots anywhere when GM portal:adapter is mock", async () => {
    stubLocation("www.tiktok.com");
    store.set("portal:adapter", "mock");
    const { shouldBoot, isMockForced } = await import("./gate");
    expect(isMockForced()).toBe(true);
    expect(shouldBoot()).toBe(true);
  });

  it("ignores ?adapter=mock off live hosts", async () => {
    stubLocation("www.tiktok.com", "?adapter=mock");
    const { shouldBoot, isMockForced } = await import("./gate");
    expect(isMockForced()).toBe(false);
    expect(shouldBoot()).toBe(false);
  });

  it("honors ?adapter=mock on live hosts", async () => {
    stubLocation("fsp.fpt.edu.vn", "?adapter=mock");
    const { shouldBoot, isMockForced } = await import("./gate");
    expect(isMockForced()).toBe(true);
    expect(shouldBoot()).toBe(true);
  });
});
