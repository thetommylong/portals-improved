// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/**
 * GM pref helpers: short keys with one-shot migrate from legacy `fsp:` names.
 */

const MISSING = Symbol("gm-missing");

export function gmGetMigrate<T>(
  newKey: string,
  oldKey: string,
  fallback: T,
): T {
  const cur = GM_getValue(newKey, MISSING);
  if (cur !== MISSING) return cur as T;

  const legacy = GM_getValue(oldKey, MISSING);
  if (legacy !== MISSING) {
    GM_setValue(newKey, legacy);
    GM_deleteValue(oldKey);
    return legacy as T;
  }
  return fallback;
}

export function gmSetMigrate(
  newKey: string,
  oldKey: string,
  value: unknown,
): void {
  GM_setValue(newKey, value);
  GM_deleteValue(oldKey);
}
