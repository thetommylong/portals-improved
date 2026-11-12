// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Flush tiled chrome vs classic floating inset panels. */
export const CHROME_OPTIONS = ["flush", "floating"] as const;
export type ChromeChoice = (typeof CHROME_OPTIONS)[number];

const CHROME_KEY = "fsp:shell-chrome";

function storedChrome(): ChromeChoice {
  const raw = GM_getValue<string>(CHROME_KEY, "flush");
  return (CHROME_OPTIONS as readonly string[]).includes(raw)
    ? (raw as ChromeChoice)
    : "flush";
}

class ShellChromeStore {
  chrome = $state<ChromeChoice>(storedChrome());

  setChrome(choice: ChromeChoice): void {
    this.chrome = choice;
    GM_setValue(CHROME_KEY, choice);
  }
}

export const shellChrome = new ShellChromeStore();
