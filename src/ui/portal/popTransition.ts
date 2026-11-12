// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { cubicOut } from "svelte/easing";
import { prefersReducedMotion } from "svelte/motion";
import { scale } from "svelte/transition";

/** Settings / desktop notification popovers. */
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

/** Mobile notification sheet: slide from top. Desktop: scale. */
export function notifPanel(node: Element) {
  if (prefersReducedMotion.current) return { duration: 0 };
  if (window.matchMedia("(max-width: 768px)").matches) {
    return {
      duration: 280,
      easing: cubicOut,
      css: (t: number) => `transform: translateY(${(1 - t) * -100}%)`,
    };
  }
  return scale(node, popScale());
}
