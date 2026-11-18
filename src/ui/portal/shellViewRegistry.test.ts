// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import { viewChunkPending, type ViewFeatureFlags } from "./shellViewRegistry";

const allOn: ViewFeatureFlags = {
  schedule: true,
  marks: true,
  feedback: true,
  homeworks: true,
  events: true,
  standing: true,
  clubs: true,
};

describe("viewChunkPending", () => {
  it("is true when feature on and chunk missing", () => {
    expect(viewChunkPending("home", allOn, {})).toBe(true);
    expect(viewChunkPending("marks", allOn, {})).toBe(true);
    expect(viewChunkPending("feedback", allOn, {})).toBe(true);
    expect(viewChunkPending("homeworks", allOn, {})).toBe(true);
    expect(viewChunkPending("events", allOn, {})).toBe(true);
    expect(viewChunkPending("standing", allOn, {})).toBe(true);
    expect(viewChunkPending("clubs", allOn, {})).toBe(true);
  });

  it("is false when chunk already loaded", () => {
    expect(viewChunkPending("home", allOn, { home: true })).toBe(false);
    expect(viewChunkPending("clubs", allOn, { clubs: true })).toBe(false);
  });

  it("is false when feature off even if unloaded", () => {
    expect(viewChunkPending("home", { ...allOn, schedule: false }, {})).toBe(
      false,
    );
    expect(viewChunkPending("marks", { ...allOn, marks: false }, {})).toBe(
      false,
    );
  });
});
