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
