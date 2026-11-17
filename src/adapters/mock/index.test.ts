// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import MockAdapter, { MockAdapter as Named } from "./index";

describe("adapters/mock index", () => {
  it("default-exports MockAdapter", () => {
    expect(MockAdapter).toBe(Named);
    expect(new MockAdapter().hosts).toEqual([]);
  });
});
