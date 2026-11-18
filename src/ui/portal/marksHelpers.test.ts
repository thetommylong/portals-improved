// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import {
  extractMilestones,
  getCKValue,
  getGKValue,
  parseScore,
  semesterAverage,
} from "./marksHelpers";

describe("parseScore", () => {
  it("parses numeric strings", () => {
    expect(parseScore("8.5")).toBe(8.5);
  });

  it("returns null for empty / invalid", () => {
    expect(parseScore("")).toBeNull();
    expect(parseScore(null)).toBeNull();
    expect(parseScore("x")).toBeNull();
  });
});

describe("milestone helpers", () => {
  const milestones: [string, string][] = [
    ["Điểm giữa kỳ", "7"],
    ["Điểm cuối kỳ", "8"],
  ];

  it("reads GK / CK", () => {
    expect(getGKValue(milestones)).toBe(7);
    expect(getCKValue(milestones)).toBe(8);
  });
});

describe("extractMilestones", () => {
  it("returns empty for missing dto", () => {
    expect(extractMilestones(undefined)).toEqual([]);
    expect(extractMilestones({})).toEqual([]);
  });

  it("keeps GK / CK / TB cuối pairs and skips empty", () => {
    expect(
      extractMilestones({
        "Điểm giữa kỳ": "7",
        "Điểm cuối kì": "8",
        "TB cuối kỳ": "7.5",
        "Đánh giá thường xuyên 1": "9",
        skip: "",
        also: null,
      }),
    ).toEqual([
      ["Điểm giữa kỳ", "7"],
      ["Điểm cuối kì", "8"],
      ["TB cuối kỳ", "7.5"],
    ]);
  });
});

describe("semesterAverage", () => {
  it("weights GK×2 and CK×3 with TX", () => {
    expect(semesterAverage([8, 8], 7, 9)).toBeCloseTo(
      (8 + 8 + 7 * 2 + 9 * 3) / (2 + 5),
    );
  });

  it("returns null when everything is missing", () => {
    expect(semesterAverage([], null, null)).toBeNull();
  });
});
