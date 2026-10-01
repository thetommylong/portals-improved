// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { flavors, type FlavorName } from "@catppuccin/palette";

export const FLAVOR_OPTIONS = [
  "system",
  "latte",
  "frappe",
  "macchiato",
  "mocha",
] as const;
export type FlavorChoice = (typeof FLAVOR_OPTIONS)[number];

export const DARK_FLAVORS = ["frappe", "macchiato", "mocha"] as const;
export type DarkFlavorChoice = (typeof DARK_FLAVORS)[number];

export const ACCENTS = [
  "rosewater",
  "flamingo",
  "pink",
  "mauve",
  "red",
  "maroon",
  "peach",
  "yellow",
  "green",
  "teal",
  "sky",
  "sapphire",
  "blue",
  "lavender",
] as const;
export type AccentChoice = (typeof ACCENTS)[number];

const FLAVOR_KEY = "fsp:flavor";
const ACCENT_KEY = "fsp:accent";
const SYSTEM_DARK_KEY = "fsp:system-dark";

function storedFlavor(): FlavorChoice {
  const raw = GM_getValue<string>(FLAVOR_KEY, "system");
  return (FLAVOR_OPTIONS as readonly string[]).includes(raw)
    ? (raw as FlavorChoice)
    : "system";
}

function storedAccent(): AccentChoice {
  const raw = GM_getValue<string>(ACCENT_KEY, "blue");
  return (ACCENTS as readonly string[]).includes(raw)
    ? (raw as AccentChoice)
    : "blue";
}

function storedSystemDark(): DarkFlavorChoice {
  const raw = GM_getValue<string>(SYSTEM_DARK_KEY, "mocha");
  return (DARK_FLAVORS as readonly string[]).includes(raw)
    ? (raw as DarkFlavorChoice)
    : "mocha";
}

class ThemeStore {
  flavor = $state<FlavorChoice>(storedFlavor());
  accent = $state<AccentChoice>(storedAccent());
  systemDark = $state<DarkFlavorChoice>(storedSystemDark());

  setFlavor(choice: FlavorChoice): void {
    this.flavor = choice;
    GM_setValue(FLAVOR_KEY, choice);
  }

  setAccent(choice: AccentChoice): void {
    this.accent = choice;
    GM_setValue(ACCENT_KEY, choice);
  }

  setSystemDark(choice: DarkFlavorChoice): void {
    this.systemDark = choice;
    GM_setValue(SYSTEM_DARK_KEY, choice);
  }
}

export const theme = new ThemeStore();

const lightQuery = window.matchMedia("(prefers-color-scheme: light)");
let systemLight = $state(lightQuery.matches);
lightQuery.addEventListener("change", (e) => (systemLight = e.matches));

export function resolvedFlavor(): FlavorName {
  if (theme.flavor !== "system") return theme.flavor;
  return systemLight ? "latte" : theme.systemDark;
}

export function applyTheme(): void {
  const flavor = flavors[resolvedFlavor()] ?? flavors.mocha;
  const rootStyle = document.documentElement.style;
  for (const [name, meta] of flavor.colorEntries) {
    rootStyle.setProperty(`--${name}`, meta.hex);
  }
  rootStyle.setProperty("--accent", flavor.colors[theme.accent].hex);
}
