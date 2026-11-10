// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/**
 * vite-plugin-monkey concatenates every Svelte CSS chunk into the userscript
 * entry and would call GM_addStyle immediately — before our idle gate. The
 * build wires `cssSideEffects` to queue into this key instead; we flush only
 * when booting, and discard on idle hosts so off-portal pages stay untouched.
 */
export const PENDING_CSS_KEY = "__portalsImprovedPendingCss";

type PendingCssHost = typeof globalThis & {
  [PENDING_CSS_KEY]?: string[];
};

function pendingHost(): PendingCssHost {
  return globalThis as PendingCssHost;
}

/** Used by vite `build.cssSideEffects` (stringified into the monkey CSS helper). */
export function queueMonkeyCss(css: string): void {
  const g = pendingHost();
  (g[PENDING_CSS_KEY] ??= []).push(css);
}

export function takePendingCss(): string[] {
  const g = pendingHost();
  const pending = g[PENDING_CSS_KEY] ?? [];
  g[PENDING_CSS_KEY] = [];
  return pending;
}

export function injectCss(css: string): void {
  if (typeof GM_addStyle === "function") {
    GM_addStyle(css);
    return;
  }
  const el = document.createElement("style");
  el.append(css);
  (document.head || document.documentElement).appendChild(el);
}

/** Apply CSS queued by the monkey entry, if any. */
export function flushPendingCss(): void {
  for (const css of takePendingCss()) injectCss(css);
}

/** Drop queued CSS without injecting — idle / no-op path. */
export function discardPendingCss(): void {
  takePendingCss();
}
