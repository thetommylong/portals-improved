// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { cubicOut } from "svelte/easing";
import { prefersReducedMotion } from "svelte/motion";

/** Settings / notifications popovers. */
export function popScale() {
  if (prefersReducedMotion.current) return { duration: 0 };
  return { duration: 120, start: 0.9, easing: cubicOut };
}

/** Centered modals, drawers, and dialogs. */
export function modalScale() {
  if (prefersReducedMotion.current) return { duration: 0 };
  return { duration: 120, start: 0.96, easing: cubicOut };
}

export function backdropFade() {
  if (prefersReducedMotion.current) return { duration: 0 };
  return { duration: 120, easing: cubicOut };
}
