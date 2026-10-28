// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Mix `color` 65% toward `text` (DESIGN-SPEC Latte ink rule). */
export function inkTowardText(color: string, text: string): string {
  return `color-mix(in srgb, ${color} 35%, ${text})`;
}
