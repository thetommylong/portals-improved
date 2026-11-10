// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function installLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  return storage;
}

describe("demo gm-shim API key storage", () => {
  let storage: Storage;

  beforeEach(() => {
    vi.resetModules();
    storage = installLocalStorageMock();
    // gm-shim assigns onto window.*; mirror it in node.
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
  });

  afterEach(() => {
    storage.clear();
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "GM_getValue");
    Reflect.deleteProperty(globalThis, "GM_setValue");
    Reflect.deleteProperty(globalThis, "GM_deleteValue");
    Reflect.deleteProperty(globalThis, "GM_xmlhttpRequest");
  });

  it("keeps fsp:sdk:api_key in memory, not localStorage", async () => {
    storage.setItem("fsp:sdk:api_key", JSON.stringify("sk-stale"));
    await import("./gm-shim");

    expect(storage.getItem("fsp:sdk:api_key")).toBeNull();

    window.GM_setValue("fsp:sdk:api_key", "sk-demo-secret");
    window.GM_setValue("fsp:flavor", "mocha");

    expect(storage.getItem("fsp:sdk:api_key")).toBeNull();
    expect(storage.getItem("fsp:flavor")).toBe(JSON.stringify("mocha"));
    expect(window.GM_getValue("fsp:sdk:api_key", null)).toBe("sk-demo-secret");

    window.GM_deleteValue("fsp:sdk:api_key");
    expect(window.GM_getValue("fsp:sdk:api_key", null)).toBeNull();
  });
});
