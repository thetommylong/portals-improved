---
name: portals-improved
description: Catppuccin operate shell for the FSP portal userscript
colors:
  accent-default: "teal"
  surface-base: "{flavor.base}"
  surface-raised: "{flavor.mantle}"
  surface-sunken: "{flavor.crust}"
  text: "{flavor.text}"
  text-secondary: "{flavor.subtext}"
  text-muted: "{flavor.overlay0}"
  danger: "{flavor.red}"
  warning: "{flavor.yellow}"
  success: "{flavor.green}"
  info: "{flavor.blue}"
typography:
  body:
    fontFamily: '"Google Sans Flex", system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 500
  card-title:
    fontFamily: '"Google Sans Flex", system-ui, sans-serif'
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.25
  predictor-result:
    fontFamily: '"Google Sans Flex", system-ui, sans-serif'
    fontSize: "28px"
    fontWeight: 700
  icon:
    fontFamily: "SVG Icon.svelte (inline paths)"
rounded:
  tight: "6px"
  control: "8px"
  card: "12px"
  surface: "16px"
spacing:
  shell-gap: "12px"
  card-pad: "14px 16px"
components:
  list-card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  status-badge:
    rounded: "{rounded.control}"
    padding: "3px 10px"
---

## Overview

Operate-mode shell that fully replaces the FSP page chrome. Soft raised panels (`mantle` on `base`), Catppuccin flavor tokens, Google Sans Flex (narrowed weights) + inline SVG icons via `Icon.svelte`. Brand shows in settings about and sr-only app title; the schedule “now” line and lesson status stripes are the strongest visual signatures.

## Colors

Four Catppuccin flavors: Latte (light) and Frappé / Macchiato / Mocha (dark). System flavor follows `prefers-color-scheme`, with a selectable dark fallback. Accents are the Catppuccin accent set minus blue (reserved as `--info` for links). Default accent is **teal** for fresh installs (existing stored `mauve` is left alone). On Latte, accent/danger/warning/success/info ink is mixed toward text via `inkTowardText` for contrast.

Semantic aliases: `--surface-base|raised|sunken`, `--border-subtle|strong`, `--danger|warning|success|info` (+ `-ink` variants), toast `--panel-*`.

## Typography

Google Sans Flex is loaded from Google Fonts at fixed width (`wdth=100`) and weights 400/600/700 only (no Material Symbols). Card titles ~18px / 700; body ~13px; meta ~11–12px uppercase where used. Predictor result values ~28px / `font-weight: 700`.

## Layout

Full-viewport `#fsp-qol-root` overlay. Desktop: header strip + collapsible left nav + main (+ optional chat panel). Mobile: scrim + drawer nav. `PortalShell` dynamically imports nav views per `activeNav` (and chat on open); only the active view mounts. List pages use interactive cards (`fb-card` / `mark-card`) with `content-visibility: auto`.

## Elevation & Depth

Quiet depth: 1px subtle borders, light hover shadow on cards, stronger shadow on floating dialogs/drawers. No glow stacks. Motion tokens `--motion-fast` / `--motion-med`; respect `prefers-reduced-motion`.

## Shapes

Radius scale: tight 6 / control 8 / card 12 / surface 16. Status pills and badges use `--radius-control` (not pill `999px`). Lesson status uses a left accent stripe (semantic, not decorative).

## Components

- **Shell**: skip link → header → sidebar → `main#fsp-main`; notifications panel mounts only when open; avatar prefers https, else data URL, else initials fallback.
- **Icons:** inline SVG via `Icon.svelte` / `icons.ts` — Material Symbols Rounded paths (wght 400, FILL 0/1), not a webfont. Regenerate with `node scripts/sync-material-symbol-icons.mjs`.
- **List cards**: raised surface, 18px titles, control-radius badges.
- **Overlays**: dialogs with focus trap where wired; toast Escape ignored only while `[role="dialog"][aria-modal="true"]` is open.
- **Predictor**: drawer with large result typography for TB/CN/need-on-final.
- **Chat**: optional; ConfirmCard gates mutating agent tools.

## Do's and Don'ts

**Do**

- Drive color through Catppuccin CSS variables from `applyTheme()`.
- Keep blue for informational links only.
- Prefer teal/sapphire/peach accents over a mauve-default “AI purple” look.
- Use cards for interactive list units, not hero decoration.
- Scope styles under `#fsp-qol-root`.
- Keep icon names in `ICON_PATHS` / `ICON_PATHS_FILL` when adding UI icons (sync from `@material-symbols/svg-400`).

**Don't**

- Introduce purple-on-white gradient marketing chrome or flat single-hex backgrounds as the brand.
- Use `999px` pill radii for status badges.
- Put stats, schedules, or promo chips in a marketing hero (demo site is preview-only).
- Bypass the adapter boundary or talk to FSP APIs from UI components directly.

