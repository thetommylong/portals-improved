// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import { getOidcAccessToken } from "./fsp-auth-token";

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

describe("getOidcAccessToken", () => {
  it("reads authnResult.access_token from fsp.oidc.v1.* session blobs", () => {
    const storage = memoryStorage({
      "fsp.oidc.v1.fsp-desktop-front-end": JSON.stringify({
        authnResult: { access_token: "eyJhbGciOi.test-token" },
        authzData: "eyJhbGciOi.authz",
      }),
    });
    expect(getOidcAccessToken(storage)).toBe("eyJhbGciOi.test-token");
  });

  it("falls back to JWT-shaped authzData", () => {
    const storage = memoryStorage({
      "fsp.oidc.v1.other-client": JSON.stringify({
        authzData: "eyJhbGciOi.authz-only",
      }),
    });
    expect(getOidcAccessToken(storage)).toBe("eyJhbGciOi.authz-only");
  });

  it("returns null when no oidc blob exists", () => {
    const storage = memoryStorage({
      unrelated: JSON.stringify({ access_token: "x" }),
    });
    expect(getOidcAccessToken(storage)).toBeNull();
  });
});
