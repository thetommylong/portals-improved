// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import { matchesHost } from "./adapter";

describe("matchesHost", () => {
  it("matches when hostname includes a fragment", () => {
    expect(matchesHost("fsp.fpt.edu.vn", ["fsp"])).toBe(true);
  });

  it("is case-sensitive substring match", () => {
    expect(matchesHost("FSP.fpt.edu.vn", ["fsp"])).toBe(false);
  });

  it("returns false when no fragment matches", () => {
    expect(matchesHost("example.com", ["fsp"])).toBe(false);
  });

  it("returns false for an empty fragment list", () => {
    expect(matchesHost("fsp.fpt.edu.vn", [])).toBe(false);
  });
});
