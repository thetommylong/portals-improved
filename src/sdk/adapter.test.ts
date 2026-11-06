// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import { matchesHost } from "./adapter";

describe("matchesHost", () => {
  it("matches when hostname starts with a fragment label", () => {
    expect(matchesHost("fsp.fpt.edu.vn", ["fsp"])).toBe(true);
  });

  it("is case-insensitive for DNS labels", () => {
    expect(matchesHost("FSP.fpt.edu.vn", ["fsp"])).toBe(true);
  });

  it("matches a middle or trailing DNS label", () => {
    expect(matchesHost("student.fsp.example.com", ["fsp"])).toBe(true);
    expect(matchesHost("portal.fsp", ["fsp"])).toBe(true);
  });

  it("rejects substring-only collisions", () => {
    expect(matchesHost("xfsp.example.com", ["fsp"])).toBe(false);
    expect(matchesHost("fspx.example.com", ["fsp"])).toBe(false);
    expect(matchesHost("myfsp.edu.vn", ["fsp"])).toBe(false);
  });

  it("returns false when no fragment matches", () => {
    expect(matchesHost("example.com", ["fsp"])).toBe(false);
  });

  it("returns false for an empty fragment list", () => {
    expect(matchesHost("fsp.fpt.edu.vn", [])).toBe(false);
  });
});
