// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { beforeAll, describe, expect, it, vi } from "vitest";

vi.stubGlobal("window", {
  location: { hostname: "localhost", search: "" },
});
vi.stubGlobal("GM_getValue", () => "");
vi.stubGlobal("GM_setValue", () => {});

vi.mock("../adapters/runtime.svelte", () => ({
  runtime: { adapter: {} },
  hasLiveAdapter: () => false,
  isMockForced: () => true,
}));

describe("validateArgs collection and numeric caps", () => {
  let validateArgs: typeof import("./executor").validateArgs;
  let MAX_ARRAY_ITEMS: typeof import("./executor").MAX_ARRAY_ITEMS;
  let MAX_NUMBER_ABS: typeof import("./executor").MAX_NUMBER_ABS;

  beforeAll(async () => {
    ({ validateArgs, MAX_ARRAY_ITEMS, MAX_NUMBER_ABS } =
      await import("./executor"));
  });

  it("accepts normal array and number arguments", () => {
    expect(
      validateArgs("getCampusesByIds", {
        campusIds: ["c1", "c2", "c3"],
      }),
    ).toBeNull();

    expect(
      validateArgs("updateFeedbackComment", {
        slot: 1,
        feedbackLecturerId: "fl-1",
        studentId: "s-1",
        comment: "ok",
      }),
    ).toBeNull();
  });

  it("rejects arrays larger than MAX_ARRAY_ITEMS", () => {
    const huge = Array.from({ length: 10_000 }, (_, i) => `id-${i}`);
    const err = validateArgs("getCampusesByIds", { campusIds: huge });
    expect(err).toBe(
      `Invalid value for campusIds: array exceeds max length of ${MAX_ARRAY_ITEMS}`,
    );
  });

  it("rejects non-finite numbers", () => {
    expect(
      validateArgs("updateFeedbackComment", {
        slot: Number.NaN,
        feedbackLecturerId: "fl-1",
        studentId: "s-1",
        comment: "ok",
      }),
    ).toBe("Invalid value for slot: expected a finite number");

    expect(
      validateArgs("updateFeedbackComment", {
        slot: Number.POSITIVE_INFINITY,
        feedbackLecturerId: "fl-1",
        studentId: "s-1",
        comment: "ok",
      }),
    ).toBe("Invalid value for slot: expected a finite number");
  });

  it("rejects numbers beyond safe absolute bounds", () => {
    expect(
      validateArgs("updateFeedbackComment", {
        slot: MAX_NUMBER_ABS + 1,
        feedbackLecturerId: "fl-1",
        studentId: "s-1",
        comment: "ok",
      }),
    ).toBe("Invalid value for slot: number exceeds safe bounds");
  });
});
