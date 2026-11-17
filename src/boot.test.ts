// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";

/** Same pattern boot.ts uses — folder `index.ts` only, not helpers. */
const scriptEntries = import.meta.glob("./scripts/*/index.ts");

describe("script folder discovery", () => {
  it("globs only scripts/*/index.ts", () => {
    expect(Object.keys(scriptEntries).sort()).toEqual([
      "./scripts/devtools/index.ts",
      "./scripts/portal/index.ts",
    ]);
  });
});
