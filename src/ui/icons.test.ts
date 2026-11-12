// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import {
  ICON_NAMES,
  ICON_PATHS,
  ICON_PATHS_FILL,
  ICON_VIEWBOX,
  isIconName,
} from "./icons";

const sources = import.meta.glob(["../**/*.{ts,svelte}", "!./**/*.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Collect runtime icon ligature strings from portal/UI sources. */
function collectRuntimeIconNames(source: string): string[] {
  const names = new Set<string>();

  for (const m of source.matchAll(/\bname="([a-z_]+)"/g)) {
    names.add(m[1]);
  }
  for (const m of source.matchAll(/\bname=\{['"]([a-z_]+)['"]\}/g)) {
    names.add(m[1]);
  }
  // `<Icon name={cond ? "a" : "b"} />`
  for (const m of source.matchAll(
    /\bname=\{[^}]*\?\s*['"]([a-z_]+)['"]\s*:\s*['"]([a-z_]+)['"][^}]*\}/g,
  )) {
    names.add(m[1]);
    names.add(m[2]);
  }
  for (const m of source.matchAll(/createIconSvg\(\s*['"]([a-z_]+)['"]/g)) {
    names.add(m[1]);
  }
  // Nav / toast maps: icon: "home", success: "check_circle"
  for (const m of source.matchAll(/\bicon:\s*["']([a-z_]+)["']/g)) {
    names.add(m[1]);
  }
  for (const m of source.matchAll(
    /\b(?:success|error|info)\s*:\s*["']([a-z_]+)["']/g,
  )) {
    names.add(m[1]);
  }

  return [...names];
}

describe("ICON_PATHS registry", () => {
  it("uses Material Symbols viewBox", () => {
    expect(ICON_VIEWBOX).toBe("0 -960 960 960");
  });

  it("has non-empty FILL 0 and FILL 1 paths for every ICON_NAMES entry", () => {
    for (const name of ICON_NAMES) {
      expect(isIconName(name)).toBe(true);
      expect(ICON_PATHS[name]?.length).toBeGreaterThan(0);
      expect(ICON_PATHS_FILL[name]?.length).toBeGreaterThan(0);
    }
  });

  it("covers every runtime Icon / createIconSvg / ICONS name in src", () => {
    const used = new Set<string>();
    for (const [path, source] of Object.entries(sources)) {
      if (path.endsWith("/icons.ts")) continue;
      for (const name of collectRuntimeIconNames(source)) {
        used.add(name);
      }
    }

    expect(used.size).toBeGreaterThan(0);
    const missing = [...used].filter((name) => !isIconName(name));
    expect(missing, `unknown icon names: ${missing.join(", ")}`).toEqual([]);
  });
});
