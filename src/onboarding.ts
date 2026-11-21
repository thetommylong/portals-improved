// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { gmGetMigrate, gmSetMigrate } from "./gmPrefs";

const LAST_SEEN_KEY = "last-seen-version";

export const RELEASES_URL =
  "https://github.com/thetommylong/portals-improved/releases";

export function currentBuildVersion(): string {
  return __BUILD__.version;
}

export function getLastSeenVersion(): string {
  const raw = gmGetMigrate(LAST_SEEN_KEY, "fsp:last-seen-version", "");
  return typeof raw === "string" ? raw : "";
}

export function setLastSeenVersion(
  version: string = currentBuildVersion(),
): void {
  gmSetMigrate(LAST_SEEN_KEY, "fsp:last-seen-version", version);
}

/** No stored version yet — show first-run overview (not an update toast). */
export function needsFirstRun(): boolean {
  return getLastSeenVersion() === "";
}

/** Returning user on a newer build — show update toast. */
export function needsUpdateToast(): boolean {
  const seen = getLastSeenVersion();
  if (seen === "") return false;
  return seen !== currentBuildVersion();
}
