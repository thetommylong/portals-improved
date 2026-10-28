// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface OverlayFocusHandle {
  /** Call from the dialog/panel's keydown (bubbling). */
  onKeydown(e: KeyboardEvent): void;
  /** Release focus restore. */
  release(): void;
}

/**
 * Focus trap + initial focus for modal overlays. Escape is handled by the
 * caller via `onEscape` (so window-level and local handlers stay consistent).
 */
export function attachOverlayFocus(
  container: HTMLElement,
  onEscape: () => void,
): OverlayFocusHandle {
  const previouslyFocused =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  const focusables = () =>
    Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
    );

  const first = focusables()[0] ?? container;
  if (typeof first.focus === "function") {
    first.focus();
  } else {
    container.focus();
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onEscape();
      return;
    }
    if (e.key !== "Tab") return;
    const list = focusables();
    if (list.length === 0) {
      e.preventDefault();
      container.focus();
      return;
    }
    const firstEl = list[0];
    const lastEl = list[list.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && active === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  }

  container.addEventListener("keydown", onKeydown);

  return {
    onKeydown,
    release() {
      container.removeEventListener("keydown", onKeydown);
      previouslyFocused?.focus?.();
    },
  };
}
