// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import { modeFromPointerType } from "./pointer";

describe("modeFromPointerType", () => {
  it("maps touch to coarse", () => {
    expect(modeFromPointerType("touch")).toBe("coarse");
  });

  it("maps mouse and pen to fine", () => {
    expect(modeFromPointerType("mouse")).toBe("fine");
    expect(modeFromPointerType("pen")).toBe("fine");
  });

  it("returns null for unknown types", () => {
    expect(modeFromPointerType("")).toBeNull();
    expect(modeFromPointerType("eraser")).toBeNull();
  });
});
