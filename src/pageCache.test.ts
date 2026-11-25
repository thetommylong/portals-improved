// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getJson, pageCacheKey, removeJson, setJson } from "./pageCache";

const mem = new Map<string, string>();

describe("pageCache", () => {
  beforeEach(() => {
    mem.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
    });
  });

  it("namespaces keys", () => {
    expect(pageCacheKey("cal", "s1", "w1")).toBe("pi:cache:cal:s1:w1");
  });

  it("round-trips JSON and removes", () => {
    setJson("pi:cache:t", { a: 1 });
    expect(getJson<{ a: number }>("pi:cache:t")).toEqual({ a: 1 });
    removeJson("pi:cache:t");
    expect(getJson("pi:cache:t")).toBeNull();
  });

  it("swallows quota errors on write", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
      removeItem: () => {},
    });
    expect(() => setJson("pi:cache:x", "y")).not.toThrow();
  });
});
