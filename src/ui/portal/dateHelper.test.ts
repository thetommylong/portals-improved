// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import {
  centuryDecades,
  centuryStart,
  decadeStart,
  decadeYears,
  getWeek,
  monthGrid,
  sameDay,
  sameWeek,
} from "./dateHelper";

describe("getWeek", () => {
  it("returns Mon–Sun containing the day", () => {
    const wed = Temporal.PlainDate.from("2026-03-18");
    const week = getWeek(wed);
    expect(week).toHaveLength(7);
    expect(week[0]!.toString()).toBe("2026-03-16");
    expect(week[6]!.toString()).toBe("2026-03-22");
  });
});

describe("monthGrid", () => {
  it("returns 42 Monday-first cells covering the month", () => {
    const march = Temporal.PlainDate.from("2026-03-15");
    const cells = monthGrid(march);
    expect(cells).toHaveLength(42);
    expect(cells[0]!.dayOfWeek).toBe(1);
    expect(cells.some((d) => d.toString() === "2026-03-01")).toBe(true);
    expect(cells.some((d) => d.toString() === "2026-03-31")).toBe(true);
  });
});

describe("sameWeek", () => {
  it("groups days in the same ISO week", () => {
    const mon = Temporal.PlainDate.from("2026-03-16");
    const fri = Temporal.PlainDate.from("2026-03-20");
    const next = Temporal.PlainDate.from("2026-03-23");
    expect(sameWeek(mon, fri)).toBe(true);
    expect(sameWeek(mon, next)).toBe(false);
    expect(sameDay(mon, mon)).toBe(true);
  });
});

describe("decade/century helpers", () => {
  it("aligns decade and century starts", () => {
    expect(decadeStart(2026)).toBe(2020);
    expect(centuryStart(2026)).toBe(2000);
    expect(decadeYears(2026)).toEqual([
      2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029,
    ]);
    expect(centuryDecades(2026)).toEqual([
      2000, 2010, 2020, 2030, 2040, 2050, 2060, 2070, 2080, 2090,
    ]);
  });
});
