// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { gmGetMigrate, gmSetMigrate } from "./gmPrefs";

/** Flush tiled chrome vs classic floating inset panels. */
export const CHROME_OPTIONS = ["flush", "floating"] as const;
export type ChromeChoice = (typeof CHROME_OPTIONS)[number];

const CHROME_KEY = "shell-chrome";
const SIDEBAR_WIDTH_KEY = "sidebar-width";

export const SIDEBAR_WIDTH_MIN = 200;
export const SIDEBAR_WIDTH_MAX = 420;
export const SIDEBAR_WIDTH_DEFAULT = 260;

function storedChrome(): ChromeChoice {
  const raw = gmGetMigrate(CHROME_KEY, "fsp:shell-chrome", "flush");
  return (CHROME_OPTIONS as readonly string[]).includes(raw)
    ? (raw as ChromeChoice)
    : "flush";
}

function clampSidebarWidth(next: number): number {
  return Math.min(
    SIDEBAR_WIDTH_MAX,
    Math.max(SIDEBAR_WIDTH_MIN, Math.round(next)),
  );
}

function storedSidebarWidth(): number {
  const raw = gmGetMigrate(
    SIDEBAR_WIDTH_KEY,
    "fsp:sidebar-width",
    SIDEBAR_WIDTH_DEFAULT,
  );
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return SIDEBAR_WIDTH_DEFAULT;
  }
  return clampSidebarWidth(raw);
}

class ShellChromeStore {
  chrome = $state<ChromeChoice>(storedChrome());
  sidebarWidth = $state(storedSidebarWidth());

  setChrome(choice: ChromeChoice): void {
    this.chrome = choice;
    gmSetMigrate(CHROME_KEY, "fsp:shell-chrome", choice);
  }

  setSidebarWidth(next: number, persist = true): void {
    const clamped = clampSidebarWidth(next);
    this.sidebarWidth = clamped;
    if (persist) gmSetMigrate(SIDEBAR_WIDTH_KEY, "fsp:sidebar-width", clamped);
  }
}

export const shellChrome = new ShellChromeStore();
