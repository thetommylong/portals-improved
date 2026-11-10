// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Vite tags component CSS `<style>` chunks with this marker (see 50-portal boot). */
export const VITE_CSS_MARKER = "/*$vite$:";

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

/** Capture Vite-injected component CSS text before host stylesheet strip. */
export function captureOwnViteCss(doc: Document = document): string[] {
  const head = doc.head;
  if (!head) return [];
  return [...head.querySelectorAll("style")]
    .map((el) => el.textContent ?? "")
    .filter((css) => css.includes(VITE_CSS_MARKER));
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

/** Re-append captured Vite CSS chunks into `<head>` after strip. */
export function reinjectCssText(
  cssChunks: string[],
  doc: Document = document,
): void {
  const head = doc.head;
  if (!head) return;
  for (const css of cssChunks) {
    const style = doc.createElement("style");
    style.textContent = css;
    head.appendChild(style);
  }
}
