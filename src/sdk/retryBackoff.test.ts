// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it, vi } from "vitest";
import { backoffDelayMs, isAbortError, sleep } from "./retryBackoff";

describe("backoffDelayMs", () => {
  it("stays within 0..min(cap, base*2^n) with full jitter", () => {
    expect(
      backoffDelayMs(0, { baseMs: 1000, maxMs: 32_000, random: () => 0 }),
    ).toBe(0);
    // floor(r*(exp+1)) hits exp when r is in [exp/(exp+1), 1).
    const almostOne = () => 0.999999;
    expect(
      backoffDelayMs(0, { baseMs: 1000, maxMs: 32_000, random: almostOne }),
    ).toBe(1000);
    expect(
      backoffDelayMs(3, { baseMs: 1000, maxMs: 32_000, random: almostOne }),
    ).toBe(8000);
    expect(
      backoffDelayMs(10, { baseMs: 1000, maxMs: 32_000, random: almostOne }),
    ).toBe(32_000);
  });
});

describe("sleep", () => {
  it("rejects when already aborted", async () => {
    const c = new AbortController();
    c.abort();
    await expect(sleep(50, c.signal)).rejects.toSatisfy(isAbortError);
  });

  it("rejects when aborted during wait", async () => {
    vi.useFakeTimers();
    const c = new AbortController();
    const p = sleep(5_000, c.signal);
    c.abort();
    await expect(p).rejects.toSatisfy(isAbortError);
    vi.useRealTimers();
  });
});
