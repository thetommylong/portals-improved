// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { beforeEach, describe, expect, it, vi } from "vitest";
import { gmGetMigrate, gmSetMigrate } from "./gmPrefs";

const store = new Map<string, unknown>();

describe("gmPrefs migrate", () => {
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

  it("returns new key when present", () => {
    store.set("flavor", "mocha");
    store.set("fsp:flavor", "latte");
    expect(gmGetMigrate("flavor", "fsp:flavor", "system")).toBe("mocha");
  });

  it("migrates old key once", () => {
    store.set("fsp:flavor", "latte");
    expect(gmGetMigrate("flavor", "fsp:flavor", "system")).toBe("latte");
    expect(store.get("flavor")).toBe("latte");
    expect(store.has("fsp:flavor")).toBe(false);
  });

  it("falls back when neither set", () => {
    expect(gmGetMigrate("flavor", "fsp:flavor", "system")).toBe("system");
  });

  it("gmSetMigrate writes new and drops old", () => {
    store.set("fsp:locale", "vi");
    gmSetMigrate("locale", "fsp:locale", "en");
    expect(store.get("locale")).toBe("en");
    expect(store.has("fsp:locale")).toBe(false);
  });
});
