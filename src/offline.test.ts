// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./notifications", () => ({
  notify: vi.fn(),
}));

import { notify } from "./notifications";
import {
  isAuthFailure,
  isOfflineFailure,
  noteFetchFailure,
  notifyOfflineOnce,
  resetOfflineToastForTests,
} from "./offline";

describe("offline helpers", () => {
  beforeEach(() => {
    resetOfflineToastForTests();
    vi.mocked(notify).mockClear();
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects auth vs offline", () => {
    expect(isAuthFailure(new Error("Auth token expired"))).toBe(true);
    expect(isAuthFailure(new Error("HTTP 401: {}"))).toBe(true);
    expect(isOfflineFailure(new Error("Auth token expired"))).toBe(false);
    expect(isOfflineFailure(new Error("Network error: failed"))).toBe(true);
    vi.stubGlobal("navigator", { onLine: false });
    expect(isOfflineFailure(new Error("HTTP 500"))).toBe(true);
  });

  it("notifyOfflineOnce only fires once until reset", () => {
    notifyOfflineOnce("offline");
    notifyOfflineOnce("offline again");
    expect(notify).toHaveBeenCalledTimes(1);
    resetOfflineToastForTests();
    notifyOfflineOnce("offline");
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("noteFetchFailure skips auth and dedupes offline", () => {
    noteFetchFailure(new Error("Auth token expired"), {
      hasCache: false,
      failMessage: "fail",
      offlineMessage: "offline",
    });
    expect(notify).not.toHaveBeenCalled();

    noteFetchFailure(new Error("Network error: x"), {
      hasCache: true,
      failMessage: "fail",
      offlineMessage: "offline",
    });
    noteFetchFailure(new Error("Network error: y"), {
      hasCache: true,
      failMessage: "fail",
      offlineMessage: "offline",
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith("offline", "info");
  });
});
