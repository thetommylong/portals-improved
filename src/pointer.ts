// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Coarse = finger-sized targets; fine = mouse/pen-dense chrome. */
export type PointerMode = "coarse" | "fine";

/** Map a PointerEvent.pointerType to a mode, or null if unknown. */
export function modeFromPointerType(type: string): PointerMode | null {
  if (type === "touch") return "coarse";
  if (type === "mouse" || type === "pen") return "fine";
  return null;
}
