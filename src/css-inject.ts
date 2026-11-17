// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/**
 * vite-plugin-monkey concatenates every Svelte CSS chunk into the userscript
 * entry and would call GM_addStyle immediately — before our idle gate. The
 * build wires `cssSideEffects` to queue into this key instead; we flush only
 * when booting, and discard on idle hosts so off-portal pages stay untouched.
 */
export const PENDING_CSS_KEY = "__portalsImprovedPendingCss";

/**
 * Set on `globalThis` after the first boot flush. Vite `cssSideEffects` calls
 * this so CSS from lazy System.register chunks injects immediately — the gate
 * flush alone only sees CSS queued before `import("./boot")`.
 */
export const FLUSH_CSS_HOOK_KEY = "__portalsImprovedFlushCss";

type PendingCssHost = typeof globalThis & {
  [PENDING_CSS_KEY]?: string[];
  [FLUSH_CSS_HOOK_KEY]?: () => void;
};

/** CSS text last flushed at the gate — kept so strip can recover after login wait. */
let flushedCss: string[] = [];

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

function markOwn(el: HTMLStyleElement | void | null | undefined): void {
  el?.setAttribute?.("data-fsp-css", "");
}

export function injectCss(css: string): void {
  if (typeof GM_addStyle === "function") {
    const ret = GM_addStyle(css) as HTMLStyleElement | void;
    if (ret) {
      markOwn(ret);
      return;
    }
    // Some managers (esp. Firefox) return void — tag the newest <style> instead.
    const head = document.head || document.documentElement;
    const styles = head?.querySelectorAll?.("style");
    markOwn(styles?.[styles.length - 1] as HTMLStyleElement | undefined);
    return;
  }
  const el = document.createElement("style");
  markOwn(el);
  el.append(css);
  (document.head || document.documentElement).appendChild(el);
}

/** Apply CSS queued by the monkey entry, if any. */
export function flushPendingCss(): void {
  const chunks = takePendingCss();
  flushedCss.push(...chunks);
  for (const css of chunks) injectCss(css);
  // Arm live flush so later chunk `_css(...)` side effects paint immediately.
  pendingHost()[FLUSH_CSS_HOOK_KEY] = flushPendingCss;
}

/**
 * Re-apply CSS remembered from {@link flushPendingCss}.
 * Used when host strip finds no marked nodes (e.g. portal wiped `<head>` during
 * `waitForValidSession` before first boot).
 */
export function reinjectFlushedCss(): void {
  for (const css of flushedCss) injectCss(css);
}

export function hasFlushedCss(): boolean {
  return flushedCss.length > 0;
}

/** Drop queued CSS without injecting — idle / no-op path. */
export function discardPendingCss(): void {
  takePendingCss();
  Reflect.deleteProperty(pendingHost(), FLUSH_CSS_HOOK_KEY);
}

/** @internal tests */
export function resetFlushedCssForTests(): void {
  flushedCss = [];
  Reflect.deleteProperty(pendingHost(), FLUSH_CSS_HOOK_KEY);
}
