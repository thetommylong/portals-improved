// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { Temporal } from "@js-temporal/polyfill";

export function getWeek(day: Temporal.PlainDate): Temporal.PlainDate[] {
  const monday = day.subtract({ days: day.dayOfWeek - 1 });

  return Array.from({ length: 7 }, (_, i) => {
    return monday.add({ days: i });
  });
}
