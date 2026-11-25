// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { ScheduleEntry } from "./types/portal";
import { getJson, pageCacheKey, removeJson, setJson } from "./pageCache";

const MAX_WEEKS = 12;

export interface WeekCache {
  savedAt: number;
  entries: ScheduleEntry[];
}

/** Client-side TTL for schedule weeks (7 days). */
const WEEK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function weekKey(studentId: string, week: string): string {
  return pageCacheKey("cal", studentId, week);
}

function indexKey(studentId: string): string {
  return pageCacheKey("cal", studentId, "index");
}

export function readWeek(studentId: string, week: string): WeekCache | null {
  const key = weekKey(studentId, week);
  const raw = getJson<WeekCache>(key, null);
  if (!raw) return null;
  if (Date.now() - raw.savedAt > WEEK_TTL_MS) {
    removeJson(key);
    return null;
  }
  return raw;
}

export function writeWeek(
  studentId: string,
  week: string,
  entries: ScheduleEntry[],
): void {
  setJson(weekKey(studentId, week), {
    savedAt: Date.now(),
    entries,
  } satisfies WeekCache);

  const idx = indexKey(studentId);
  const index: string[] = getJson<string[]>(idx, []) ?? [];
  if (!index.includes(week)) {
    index.push(week);
  }
  while (index.length > MAX_WEEKS) {
    const oldest = index.shift();
    if (oldest) removeJson(weekKey(studentId, oldest));
  }
  setJson(idx, index);
}
