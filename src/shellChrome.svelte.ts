// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Flush tiled chrome vs classic floating inset panels. */
export const CHROME_OPTIONS = ["flush", "floating"] as const;
export type ChromeChoice = (typeof CHROME_OPTIONS)[number];

const CHROME_KEY = "fsp:shell-chrome";
const SIDEBAR_WIDTH_KEY = "fsp:sidebar-width";

export const SIDEBAR_WIDTH_MIN = 200;
export const SIDEBAR_WIDTH_MAX = 420;
export const SIDEBAR_WIDTH_DEFAULT = 260;

function storedChrome(): ChromeChoice {
  const raw = GM_getValue<string>(CHROME_KEY, "flush");
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
  const raw = GM_getValue<number>(SIDEBAR_WIDTH_KEY, SIDEBAR_WIDTH_DEFAULT);
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
    GM_setValue(CHROME_KEY, choice);
  }

  setSidebarWidth(next: number, persist = true): void {
    const clamped = clampSidebarWidth(next);
    this.sidebarWidth = clamped;
    if (persist) GM_setValue(SIDEBAR_WIDTH_KEY, clamped);
  }
}

export const shellChrome = new ShellChromeStore();
