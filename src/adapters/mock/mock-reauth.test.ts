// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it, vi } from "vitest";
import { MockAdapter } from "./mock";

describe("MockAdapter reauth", () => {
  it("reauthenticate resolves true without firing onAuthRequired", async () => {
    const adapter = new MockAdapter();
    const handler = vi.fn();
    adapter.onAuthRequired(handler);
    await expect(adapter.reauthenticate()).resolves.toBe(true);
    expect(handler).not.toHaveBeenCalled();
    adapter.clearAuthRequired();
  });
});
