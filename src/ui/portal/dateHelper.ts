// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { Temporal } from "@js-temporal/polyfill";

export function getWeek(day: Temporal.PlainDate): Temporal.PlainDate[] {
  const monday = day.subtract({ days: day.dayOfWeek - 1 });

  return Array.from({ length: 7 }, (_, i) => {
    return monday.add({ days: i });
  });
}

/** Monday-first 6×7 cells covering `anchor`'s month (padded). */
export function monthGrid(anchor: Temporal.PlainDate): Temporal.PlainDate[] {
  const first = anchor.with({ day: 1 });
  const gridStart = first.subtract({ days: first.dayOfWeek - 1 });
  return Array.from({ length: 42 }, (_, i) => gridStart.add({ days: i }));
}

export function sameDay(a: Temporal.PlainDate, b: Temporal.PlainDate): boolean {
  return Temporal.PlainDate.compare(a, b) === 0;
}

export function sameWeek(
  a: Temporal.PlainDate,
  b: Temporal.PlainDate,
): boolean {
  return sameDay(getWeek(a)[0]!, getWeek(b)[0]!);
}

/** Inclusive start year of the decade containing `year` (e.g. 2026 → 2020). */
export function decadeStart(year: number): number {
  return Math.floor(year / 10) * 10;
}

/** Inclusive start year of the century containing `year` (e.g. 2026 → 2000). */
export function centuryStart(year: number): number {
  return Math.floor(year / 100) * 100;
}

/** Ten years in the decade of `year`. */
export function decadeYears(year: number): number[] {
  const start = decadeStart(year);
  return Array.from({ length: 10 }, (_, i) => start + i);
}

/** Ten decade-start years in the century of `year` (2000, 2010, … 2090). */
export function centuryDecades(year: number): number[] {
  const start = centuryStart(year);
  return Array.from({ length: 10 }, (_, i) => start + i * 10);
}
