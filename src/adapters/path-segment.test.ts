// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import { pathSegment } from "./path-segment";

const BASE = "https://api.fpt.edu.vn/fsp/api";

function resolvePath(url: string): string {
  return new URL(url).pathname;
}

describe("pathSegment", () => {
  it("encodes ../ so WHATWG resolution cannot climb the path", () => {
    const malicious = "../VICTIM";
    const encoded = pathSegment(malicious);
    expect(encoded).toBe("..%2FVICTIM");

    const safe = `${BASE}/education-management/terms/get/default/${encoded}`;
    expect(resolvePath(safe)).toBe(
      "/fsp/api/education-management/terms/get/default/..%2FVICTIM",
    );

    const unsafe = `${BASE}/education-management/terms/get/default/${malicious}`;
    expect(resolvePath(unsafe)).toBe(
      "/fsp/api/education-management/terms/get/VICTIM",
    );
  });

  it("encodes / so it stays a single path segment", () => {
    const malicious = "foo/bar";
    const encoded = pathSegment(malicious);
    expect(encoded).toBe("foo%2Fbar");

    const safe = `${BASE}/user-management/users/${encoded}/by-id`;
    expect(resolvePath(safe)).toBe(
      "/fsp/api/user-management/users/foo%2Fbar/by-id",
    );

    const unsafe = `${BASE}/user-management/users/${malicious}/by-id`;
    expect(resolvePath(unsafe)).toBe(
      "/fsp/api/user-management/users/foo/bar/by-id",
    );
  });

  it("rejects bare . and .. (WHATWG still collapses %2E / %2E%2E)", () => {
    expect(() => pathSegment(".")).toThrow(/Invalid path segment/);
    expect(() => pathSegment("..")).toThrow(/Invalid path segment/);

    // Document why reject > encode: percent-dots still climb after URL parse.
    expect(
      resolvePath(`${BASE}/education-management/terms/get/default/%2E%2E`),
    ).toBe("/fsp/api/education-management/terms/get/");
    expect(
      resolvePath(`${BASE}/education-management/terms/get/default/..`),
    ).toBe("/fsp/api/education-management/terms/get/");
  });

  it("preserves ordinary IDs and numeric segments", () => {
    expect(pathSegment("abc-123")).toBe("abc-123");
    expect(pathSegment(2026)).toBe("2026");
    expect(pathSegment("2026-2027")).toBe("2026-2027");
  });
});
