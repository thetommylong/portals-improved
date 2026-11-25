// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/**
 * One-shot: drop old GM portal cache blobs (now live in page `pi:cache:`).
 * Prefs/secrets migration is handled by gmPrefs / secrets.
 */

const DONE_KEY = "scrubbed-gm-caches-v1";

const LEGACY_CACHE_RE =
  /^fsp:(cal|marks|terms|events|homeworks|feedback|clubs|standing):/;

export function scrubLegacyGmCaches(): void {
  if (GM_getValue(DONE_KEY, false)) return;

  const list =
    typeof GM_listValues === "function" ? GM_listValues() : ([] as string[]);
  for (const key of list) {
    if (LEGACY_CACHE_RE.test(key)) GM_deleteValue(key);
  }
  GM_setValue(DONE_KEY, true);
}
