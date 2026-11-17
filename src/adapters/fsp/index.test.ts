// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import FspLiveAdapter, { FspLiveAdapter as Named } from "./index";

describe("adapters/fsp index", () => {
  it("default-exports FspLiveAdapter", () => {
    expect(FspLiveAdapter).toBe(Named);
    expect(new FspLiveAdapter().hosts).toContain("fsp");
  });
});
