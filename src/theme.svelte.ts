// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { flavors, type FlavorName } from "@catppuccin/palette";
import { inkTowardText } from "./themeTokens";

export { inkTowardText } from "./themeTokens";

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

/** Selectable accents — blue reserved for links (`info`). */
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
  const raw = GM_getValue<string>(ACCENT_KEY, "mauve");
  // Migrate legacy default / removed blue accent.
  if (raw === "blue") {
    GM_setValue(ACCENT_KEY, "mauve");
    return "mauve";
  }
  return (ACCENTS as readonly string[]).includes(raw)
    ? (raw as AccentChoice)
    : "mauve";
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
  const name = resolvedFlavor();
  const flavor = flavors[name] ?? flavors.mocha;
  const isLatte = name === "latte";
  const rootStyle = document.documentElement.style;
  const root = document.documentElement;

  for (const [colorName, meta] of flavor.colorEntries) {
    rootStyle.setProperty(`--${colorName}`, meta.hex);
  }

  const text = flavor.colors.text.hex;
  const accent = flavor.colors[theme.accent].hex;
  const red = flavor.colors.red.hex;
  const yellow = flavor.colors.yellow.hex;
  const green = flavor.colors.green.hex;
  const blue = flavor.colors.blue.hex;

  rootStyle.setProperty("--accent", accent);
  rootStyle.setProperty(
    "--accent-strong",
    isLatte ? inkTowardText(accent, text) : accent,
  );
  rootStyle.setProperty(
    "--text-secondary",
    isLatte ? flavor.colors.subtext1.hex : flavor.colors.subtext0.hex,
  );
  rootStyle.setProperty("--text-muted", flavor.colors.overlay0.hex);

  // App background is base; raised surfaces use mantle.
  rootStyle.setProperty("--surface-base", flavor.colors.base.hex);
  rootStyle.setProperty("--surface-raised", flavor.colors.mantle.hex);
  rootStyle.setProperty("--surface-sunken", flavor.colors.crust.hex);
  rootStyle.setProperty(
    "--surface-hover",
    `color-mix(in srgb, ${text} 5%, transparent)`,
  );
  rootStyle.setProperty(
    "--surface-hover-strong",
    `color-mix(in srgb, ${text} 10%, transparent)`,
  );
  rootStyle.setProperty(
    "--border-subtle",
    `color-mix(in srgb, ${text} 8%, transparent)`,
  );
  rootStyle.setProperty(
    "--border-strong",
    `color-mix(in srgb, ${text} 16%, transparent)`,
  );

  rootStyle.setProperty("--danger", red);
  rootStyle.setProperty("--warning", yellow);
  rootStyle.setProperty("--success", green);
  rootStyle.setProperty("--info", blue);
  rootStyle.setProperty(
    "--danger-ink",
    isLatte ? inkTowardText(red, text) : red,
  );
  rootStyle.setProperty(
    "--warning-ink",
    isLatte ? inkTowardText(yellow, text) : yellow,
  );
  rootStyle.setProperty(
    "--success-ink",
    isLatte ? inkTowardText(green, text) : green,
  );
  rootStyle.setProperty(
    "--info-ink",
    isLatte ? inkTowardText(blue, text) : blue,
  );

  // Toast / panel aliases (were previously undefined).
  rootStyle.setProperty("--panel-bg", flavor.colors.mantle.hex);
  rootStyle.setProperty("--panel-text", text);
  rootStyle.setProperty(
    "--panel-border",
    `color-mix(in srgb, ${text} 8%, transparent)`,
  );
  rootStyle.setProperty(
    "--panel-success",
    isLatte ? inkTowardText(green, text) : green,
  );
  rootStyle.setProperty(
    "--panel-error",
    isLatte ? inkTowardText(red, text) : red,
  );
  rootStyle.setProperty(
    "--panel-info",
    isLatte ? inkTowardText(blue, text) : blue,
  );

  rootStyle.setProperty("--radius-tight", "6px");
  rootStyle.setProperty("--radius-control", "8px");
  rootStyle.setProperty("--radius-card", "12px");
  rootStyle.setProperty("--radius-surface", "16px");
  rootStyle.setProperty("--motion-fast", "140ms");
  rootStyle.setProperty("--motion-med", "240ms");
  rootStyle.setProperty(
    "--shadow-1",
    "0 1px 2px color-mix(in srgb, black 18%, transparent)",
  );
  rootStyle.setProperty(
    "--shadow-2",
    "0 20px 50px -28px color-mix(in srgb, black 60%, transparent)",
  );

  root.style.colorScheme = isLatte ? "light" : "dark";
  root.dataset.flavor = name;
}
