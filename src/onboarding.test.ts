// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLastSeenVersion,
  needsFirstRun,
  needsUpdateToast,
  setLastSeenVersion,
} from "./onboarding";

const store = new Map<string, unknown>();

describe("onboarding version gate", () => {
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

  it("treats empty storage as first run", () => {
    expect(getLastSeenVersion()).toBe("");
    expect(needsFirstRun()).toBe(true);
    expect(needsUpdateToast()).toBe(false);
  });

  it("same version needs neither first run nor update toast", () => {
    setLastSeenVersion("9.9.9");
    expect(needsFirstRun()).toBe(false);
    expect(needsUpdateToast()).toBe(false);
  });

  it("older stored version needs update toast", () => {
    setLastSeenVersion("0.0.1");
    expect(needsFirstRun()).toBe(false);
    expect(needsUpdateToast()).toBe(true);
  });
});
