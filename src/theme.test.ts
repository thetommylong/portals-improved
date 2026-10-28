// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import { inkTowardText } from "./themeTokens";

describe("inkTowardText", () => {
  it("emits a 65%-toward-text color-mix", () => {
    expect(inkTowardText("#cba6f7", "#cdd6f4")).toBe(
      "color-mix(in srgb, #cba6f7 35%, #cdd6f4)",
    );
  });
});
