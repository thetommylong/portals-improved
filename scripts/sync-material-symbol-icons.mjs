#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/**
 * Regenerate src/ui/icons.ts from @material-symbols/svg-400 (Rounded, wght 400).
 * Requires: pnpm add -D @material-symbols/svg-400
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rounded = join(root, "node_modules/@material-symbols/svg-400/rounded");

const ICON_NAMES = [
  "menu",
  "home",
  "chat",
  "settings",
  "close",
  "refresh",
  "notifications",
  "notifications_active",
  "assignment",
  "done_all",
  "group",
  "event",
  "shield_person",
  "block",
  "check",
  "warning",
  "smart_toy",
  "delete_sweep",
  "arrow_upward",
  "build",
  "error",
  "check_circle",
  "info",
  "more_vert",
];

function extractPath(name, filled) {
  const file = join(rounded, filled ? `${name}-fill.svg` : `${name}.svg`);
  if (!existsSync(file)) {
    throw new Error(`Missing ${file}`);
  }
  const svg = readFileSync(file, "utf8");
  const matches = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
  if (matches.length === 0) {
    throw new Error(`No path in ${file}`);
  }
  return matches[0];
}

function formatRecord(paths) {
  return ICON_NAMES.map((n) => {
    const d = paths[n];
    if (d.length < 60) return `  ${n}: "${d}",`;
    return `  ${n}:\n    "${d}",`;
  }).join("\n");
}

if (!existsSync(rounded)) {
  console.error("Install first: pnpm add -D @material-symbols/svg-400");
  process.exit(1);
}

const paths0 = Object.fromEntries(
  ICON_NAMES.map((n) => [n, extractPath(n, false)]),
);
const paths1 = Object.fromEntries(
  ICON_NAMES.map((n) => [n, extractPath(n, true)]),
);

const out = `// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/**
 * Material Symbols Rounded (weight 400) path data — inlined SVG, not a webfont.
 * Sourced from \`@material-symbols/svg-400\` (Apache-2.0). Regenerate with
 * \`node scripts/sync-material-symbol-icons.mjs\`.
 *
 * ViewBox for these paths: \`0 -960 960 960\` (not 0 0 24 24).
 */

export const ICON_VIEWBOX = "0 -960 960 960" as const;

export const ICON_NAMES = [
${ICON_NAMES.map((n) => `  "${n}",`).join("\n")}
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/** FILL 0 (outline) — default shell chrome. */
export const ICON_PATHS: Record<IconName, string> = {
${formatRecord(paths0)}
};

/** FILL 1 (solid) — active / hover optical fill. */
export const ICON_PATHS_FILL: Record<IconName, string> = {
${formatRecord(paths1)}
};

export function isIconName(value: string): value is IconName {
  return (ICON_NAMES as readonly string[]).includes(value);
}

/** DOM helper for non-Svelte call sites (toasts). */
export function createIconSvg(
  name: string,
  opts: { className?: string; size?: number; filled?: boolean } = {},
): SVGSVGElement {
  if (!isIconName(name)) {
    throw new Error(\`Unknown icon "\${name}"\`);
  }
  const size = opts.size ?? 20;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", ICON_VIEWBOX);
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  if (opts.className) svg.setAttribute("class", opts.className);
  Object.assign(svg.style, {
    display: "block",
    flexShrink: "0",
    fill: "currentColor",
  });
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    opts.filled ? ICON_PATHS_FILL[name] : ICON_PATHS[name],
  );
  svg.appendChild(path);
  return svg;
}
`;

writeFileSync(join(root, "src/ui/icons.ts"), out);
console.log("Updated src/ui/icons.ts");
