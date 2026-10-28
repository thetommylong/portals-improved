// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import type { ScheduleEntry } from "./types/portal";

const PREFIX = "fsp:cal:";
const MAX_WEEKS = 12;

export interface WeekCache {
  savedAt: number;
  entries: ScheduleEntry[];
}

/** Client-side TTL for schedule weeks (7 days). */
const WEEK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function readWeek(studentId: string, weekKey: string): WeekCache | null {
  const raw = GM_getValue<WeekCache | null>(
    `${PREFIX}${studentId}:${weekKey}`,
    null,
  );
  if (!raw) return null;
  if (Date.now() - raw.savedAt > WEEK_TTL_MS) {
    GM_deleteValue(`${PREFIX}${studentId}:${weekKey}`);
    return null;
  }
  return raw;
}

export function clearScheduleCaches(studentId?: string): void {
  if (!studentId) return;
  const indexKey = `${PREFIX}${studentId}:index`;
  const index: string[] = GM_getValue<string[]>(indexKey, []);
  for (const weekKey of index) {
    GM_deleteValue(`${PREFIX}${studentId}:${weekKey}`);
  }
  GM_deleteValue(indexKey);
}

export function writeWeek(
  studentId: string,
  weekKey: string,
  entries: ScheduleEntry[],
): void {
  GM_setValue(`${PREFIX}${studentId}:${weekKey}`, {
    savedAt: Date.now(),
    entries,
  } satisfies WeekCache);

  const indexKey = `${PREFIX}${studentId}:index`;
  const index: string[] = GM_getValue<string[]>(indexKey, []);
  if (!index.includes(weekKey)) {
    index.push(weekKey);
  }
  while (index.length > MAX_WEEKS) {
    const oldest = index.shift();
    if (oldest) {
      GM_deleteValue(`${PREFIX}${studentId}:${oldest}`);
    }
  }
  GM_setValue(indexKey, index);
}
