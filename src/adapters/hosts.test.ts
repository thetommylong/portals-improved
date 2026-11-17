// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";

/** Same pattern hosts.ts uses — per-folder hosts only. */
const hostEntries = import.meta.glob("./*/hosts.ts", { eager: true });

describe("hosts aggregate", () => {
  it("eager-globs live folder hosts and skips mock", () => {
    expect(Object.keys(hostEntries).sort()).toEqual(["./fsp/hosts.ts"]);
  });

  it("flattens LIVE_HOST_FRAGMENTS from folder hosts", async () => {
    const { LIVE_HOST_FRAGMENTS } = await import("./hosts");
    expect([...LIVE_HOST_FRAGMENTS]).toEqual(["fsp"]);
  });
});
