// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function fakeJwt(payload: Record<string, unknown>): string {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `hdr.${body}.sig`;
}

function memoryStorage(entries: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("FspLiveAdapter.reauthenticate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("copies a fresh oidc blob from the popup into opener sessionStorage", async () => {
    const fresh = fakeJwt({ exp: 9_999_999_999, userId: "u1" });
    const popupStorage = memoryStorage({
      "fsp.oidc.v1.client": JSON.stringify({
        authnResult: { access_token: fresh },
      }),
    });
    const openerStorage = memoryStorage();

    const popup = {
      closed: false,
      sessionStorage: popupStorage,
      close: vi.fn(() => {
        popup.closed = true;
      }),
    };

    const open = vi.fn(() => popup);
    vi.stubGlobal("sessionStorage", openerStorage);
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "fsp.fpt.edu.vn",
      },
      open,
    });

    const { FspLiveAdapter } = await import("./fsp-live");
    const adapter = new FspLiveAdapter();
    const ok = await adapter.reauthenticate(2_000);
    expect(ok).toBe(true);
    expect(open).toHaveBeenCalled();
    expect(openerStorage.getItem("fsp.oidc.v1.client")).toContain(fresh);
    expect(popup.close).toHaveBeenCalled();
  });

  it("returns false when the popup is blocked", async () => {
    vi.stubGlobal("window", {
      location: { protocol: "https:", hostname: "fsp.fpt.edu.vn" },
      open: vi.fn(() => null),
    });
    const { FspLiveAdapter } = await import("./fsp-live");
    const adapter = new FspLiveAdapter();
    await expect(adapter.reauthenticate(500)).resolves.toBe(false);
  });
});
