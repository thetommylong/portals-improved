// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import {
  copyFreshOidcBlobs,
  getOidcAccessToken,
  getValidOidcAccessToken,
  isJwtExpired,
  parseJwtPayload,
} from "./fsp-auth-token";

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

/** Build a JWT-shaped string with the given payload (signature ignored). */
function fakeJwt(payload: Record<string, unknown>): string {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `hdr.${body}.sig`;
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

describe("parseJwtPayload / isJwtExpired", () => {
  it("parses payload and detects expiry", () => {
    const token = fakeJwt({ exp: 1_700_000_000, userId: "u1" });
    const payload = parseJwtPayload(token);
    expect(payload).toEqual({ exp: 1_700_000_000, userId: "u1" });
    expect(isJwtExpired(payload!, 1_700_000_001)).toBe(true);
    expect(isJwtExpired(payload!, 1_699_999_999)).toBe(false);
  });
});

describe("getValidOidcAccessToken", () => {
  it("returns null for expired tokens", () => {
    const token = fakeJwt({ exp: 100 });
    const storage = memoryStorage({
      "fsp.oidc.v1.client": JSON.stringify({
        authnResult: { access_token: token },
      }),
    });
    expect(getValidOidcAccessToken(storage, 200)).toBeNull();
  });

  it("returns the token when still valid", () => {
    const token = fakeJwt({ exp: 500 });
    const storage = memoryStorage({
      "fsp.oidc.v1.client": JSON.stringify({
        authnResult: { access_token: token },
      }),
    });
    expect(getValidOidcAccessToken(storage, 100)).toBe(token);
  });
});

describe("copyFreshOidcBlobs", () => {
  it("copies only non-expired oidc blobs into the destination", () => {
    const fresh = fakeJwt({ exp: 9_999_999_999 });
    const stale = fakeJwt({ exp: 1 });
    const from = memoryStorage({
      "fsp.oidc.v1.fresh": JSON.stringify({
        authnResult: { access_token: fresh },
      }),
      "fsp.oidc.v1.stale": JSON.stringify({
        authnResult: { access_token: stale },
      }),
      noise: "nope",
    });
    const to = memoryStorage();
    expect(copyFreshOidcBlobs(from, to, 100)).toBe(true);
    expect(to.getItem("fsp.oidc.v1.fresh")).toContain(fresh);
    expect(to.getItem("fsp.oidc.v1.stale")).toBeNull();
    expect(to.getItem("noise")).toBeNull();
  });

  it("returns false when nothing fresh exists", () => {
    const from = memoryStorage({
      "fsp.oidc.v1.stale": JSON.stringify({
        authnResult: { access_token: fakeJwt({ exp: 1 }) },
      }),
    });
    const to = memoryStorage();
    expect(copyFreshOidcBlobs(from, to, 100)).toBe(false);
    expect(to.length).toBe(0);
  });
});
