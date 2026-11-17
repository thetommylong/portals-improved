// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

const LAST_SEEN_KEY = "fsp:last-seen-version";

export const RELEASES_URL =
  "https://github.com/thetommylong/portals-improved/releases";

export function currentBuildVersion(): string {
  return __BUILD__.version;
}

export function getLastSeenVersion(): string {
  const raw = GM_getValue<string>(LAST_SEEN_KEY, "");
  return typeof raw === "string" ? raw : "";
}

export function setLastSeenVersion(
  version: string = currentBuildVersion(),
): void {
  GM_setValue(LAST_SEEN_KEY, version);
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
