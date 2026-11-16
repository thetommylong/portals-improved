// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Legacy Vite marker (pre-Vite 8). Still honored if present. */
export const VITE_CSS_MARKER = "/*$vite$:";

/** Set on styles we inject via `injectCss` / `GM_addStyle` (production path). */
export const OWN_CSS_ATTR = "data-fsp-css";

/**
 * Run `fn` once `doc.body` exists.
 *
 * Userscript `run-at: document-start` and the idle gate's dynamic `import("./boot")`
 * mean this can run before `<body>` exists *or* after `DOMContentLoaded` has already
 * fired (`readyState` is `interactive`/`complete`). A DCL-only listener would hang
 * forever in the latter case — check `readyState` and fall back accordingly.
 */
export function whenDocumentBodyReady(
  fn: () => void,
  doc: Document = document,
): void {
  if (doc.body) {
    fn();
    return;
  }

  const runWhenBodyExists = () => {
    if (doc.body) {
      fn();
      return;
    }
    const root = doc.documentElement;
    if (!root) return;
    const mo = new MutationObserver(() => {
      if (doc.body) {
        mo.disconnect();
        fn();
      }
    });
    mo.observe(root, { childList: true });
  };

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", runWhenBodyExists, { once: true });
    return;
  }

  // DCL already happened (or will not fire); schedule ASAP rather than listen.
  queueMicrotask(runWhenBodyExists);
}

/** True for component CSS we must keep across the host stylesheet strip. */
export function isOwnStyleElement(el: Element): boolean {
  return (
    el.hasAttribute(OWN_CSS_ATTR) ||
    el.hasAttribute("data-vite-dev-id") ||
    (el.textContent?.includes(VITE_CSS_MARKER) ?? false)
  );
}

/**
 * Detach our style nodes from `<head>` (same element refs — Vite serve HMR keeps
 * pointing at them via `sheetsMap`).
 *
 * Vite 8 tags serve CSS with `data-vite-dev-id` and no longer prefixes the old
 * `VITE_CSS_MARKER` comment. Matching only that marker dropped PortalShell CSS
 * on strip.
 */
export function takeOwnStyleElements(
  doc: Document = document,
): HTMLStyleElement[] {
  const head = doc.head;
  if (!head) return [];
  const own = [...head.querySelectorAll("style")].filter(isOwnStyleElement);
  for (const el of own) el.remove();
  return own as HTMLStyleElement[];
}

/** Capture own CSS text (tests / callers that reinject by string). */
export function captureOwnViteCss(doc: Document = document): string[] {
  const head = doc.head;
  if (!head) return [];
  return [...head.querySelectorAll("style")]
    .filter(isOwnStyleElement)
    .map((el) => el.textContent ?? "");
}

/**
 * Drop host stylesheets so the full-page shell (ADR 001) is not polluted by portal
 * / mock-host rules.
 *
 * DOM owners (`link[rel=stylesheet]`, `style`) are removed first. CSSOM sheets
 * created via `@import` report `ownerNode === null`, so they survive a DOM-only
 * walk — disable any remaining `document.styleSheets` entries afterward. Callers
 * must reinject our own CSS *after* this runs so those new sheets stay enabled.
 */
export function stripHostStylesheets(doc: Document = document): void {
  const head = doc.head;
  if (head) {
    head
      .querySelectorAll('link[rel="stylesheet"], style')
      .forEach((el) => el.remove());
  }

  // Live StyleSheetList — snapshot before mutating disabled flags.
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      sheet.disabled = true;
    } catch {
      // UA / cross-origin sheets may reject writes; leave them alone.
    }
  }
}

/** Re-append previously detached own `<style>` nodes into `<head>`. */
export function reinjectStyleElements(
  elements: HTMLStyleElement[],
  doc: Document = document,
): void {
  const head = doc.head;
  if (!head) return;
  for (const el of elements) {
    head.appendChild(el);
    // Belt-and-suspenders: if strip disabled the sheet while detached, turn it
    // back on (observed as a possible Firefox CSSOM quirk; cheap no-op otherwise).
    try {
      if (el.sheet) el.sheet.disabled = false;
    } catch {
      // cross-origin / UA sheet
    }
  }
}

/** True when head still has a style we claim as ours. */
export function hasOwnStyleInHead(doc: Document = document): boolean {
  const head = doc.head;
  if (!head) return false;
  return !!head.querySelector(
    `style[${OWN_CSS_ATTR}], style[data-vite-dev-id]`,
  );
}

/** Re-append captured CSS chunks into `<head>` after strip (string path). */
export function reinjectCssText(
  cssChunks: string[],
  doc: Document = document,
): void {
  const head = doc.head;
  if (!head) return;
  for (const css of cssChunks) {
    const style = doc.createElement("style");
    style.setAttribute(OWN_CSS_ATTR, "");
    style.textContent = css;
    head.appendChild(style);
  }
}
