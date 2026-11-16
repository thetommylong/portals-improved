// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { createIconSvg, type IconName } from "./ui/icons";

export type ToastKind = "info" | "success" | "error";

const DURATION = 4000;
/** Matches theme `--motion-med` (exit / enter duration). */
const MOTION_MS = 240;
const FONT = '"Google Sans Flex", system-ui, sans-serif';
const STYLE_ID = "fsp-toast-css";

const ICONS: Record<ToastKind, IconName> = {
  success: "check_circle",
  error: "error",
  info: "info",
};

const COLORS: Record<ToastKind, string> = {
  success: "var(--panel-success)",
  error: "var(--panel-error)",
  info: "var(--panel-info)",
};

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const NARROW_MQ = "(max-width: 768px)";

let stack: HTMLDivElement | null = null;
let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

function isNarrow(): boolean {
  return window.matchMedia(NARROW_MQ).matches;
}

/** Mobile: from top. Desktop: from right. */
function offscreenTransform(narrow: boolean): string {
  if (REDUCED) return "none";
  return narrow ? "translateY(-120%)" : "translateX(120%)";
}

function pageDocument(): Document {
  return typeof unsafeWindow !== "undefined" ? unsafeWindow.document : document;
}

/** Prefer the shell host — boot's replaceChildren can leave a detached body stack. */
function toastParent(doc: Document): HTMLElement {
  return doc.getElementById("fsp-qol-root") ?? doc.body;
}

/** Bottom edge of shell header (viewport px), or a safe fallback. */
function headerBottomPx(doc: Document): number {
  const header = doc.querySelector<HTMLElement>("#fsp-qol-root .header");
  if (header) return Math.ceil(header.getBoundingClientRect().bottom);
  return 56;
}

/** Lay out the fixed toast stack for current viewport. */
function layoutStack(s: HTMLDivElement, doc: Document): void {
  const narrow = isNarrow();
  const headerBottom = headerBottomPx(doc);
  // Mobile: clip at header edge so top slide enter/exit goes behind it.
  // Desktop: sit just under header; slide in from the right (no clip).
  Object.assign(s.style, {
    top: narrow ? `${headerBottom}px` : `${headerBottom + 8}px`,
    right: "16px",
    left: "16px",
    paddingTop: narrow ? "8px" : "0",
    alignItems: narrow ? "stretch" : "flex-end",
    overflow: narrow ? "hidden" : "visible",
  });
}

function ensureToastCss(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const el = doc.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
.fsp-toast-timed:focus-visible,
.fsp-toast-action:focus-visible,
.fsp-toast-dismiss:focus-visible {
  outline: 2px solid var(--accent-strong, var(--accent));
  outline-offset: 1px;
}
.fsp-toast-action:hover:not(:disabled) {
  background: color-mix(in srgb, currentColor 14%, transparent);
}
.fsp-toast-dismiss:hover {
  opacity: 1;
  background: color-mix(in srgb, var(--panel-text) 10%, transparent);
}
.fsp-toast-action:disabled {
  cursor: wait;
  opacity: 0.65;
}
`.trim();
  (doc.head ?? toastParent(doc)).append(el);
}

function ensureStack(): HTMLDivElement {
  const doc = pageDocument();
  ensureToastCss(doc);
  const parent = toastParent(doc);
  // Recreate when detached or parented under the wrong node.
  if (stack?.isConnected && stack.parentElement === parent) {
    layoutStack(stack, doc);
    return stack;
  }

  if (escapeHandler) {
    stack?.ownerDocument?.removeEventListener("keydown", escapeHandler);
    escapeHandler = null;
  }
  stack?.remove();

  stack = doc.createElement("div");
  stack.setAttribute("role", "status");
  stack.setAttribute("aria-live", "polite");
  stack.setAttribute("aria-relevant", "additions removals");
  Object.assign(stack.style, {
    position: "fixed",
    zIndex: "2147483647",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    pointerEvents: "none",
    fontFamily: FONT,
    boxSizing: "border-box",
  });
  layoutStack(stack, doc);
  parent.append(stack);

  escapeHandler = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !stack?.lastElementChild) return;
    // Let modal dialogs own Escape; don't dismiss a toast underneath them.
    if (doc.querySelector('[role="dialog"][aria-modal="true"]')) return;
    const last = stack.lastElementChild as HTMLElement;
    last.dispatchEvent(new Event("fsp-toast-dismiss"));
  };
  doc.addEventListener("keydown", escapeHandler);

  return stack;
}

function removeStackIfNeeded() {
  if (stack && stack.children.length === 0) {
    stack.remove();
    stack = null;
    if (escapeHandler) {
      pageDocument().removeEventListener("keydown", escapeHandler);
      escapeHandler = null;
    }
  }
}

function restoreStackPolite(s: HTMLDivElement, type: ToastKind): void {
  if (type !== "error") return;
  s.setAttribute("role", "status");
  s.setAttribute("aria-live", "polite");
}

function styleToastShell(
  toast: HTMLButtonElement | HTMLDivElement,
  type: ToastKind,
  narrow: boolean,
): void {
  Object.assign(toast.style, {
    pointerEvents: "auto",
    boxSizing: "border-box",
    width: narrow ? "100%" : "max-content",
    maxWidth: narrow ? "100%" : "min(360px, 100%)",
    padding: "12px 14px",
    borderRadius: "var(--radius-card)",
    background: "var(--panel-bg)",
    color: "var(--panel-text)",
    border: "1px solid var(--panel-border)",
    borderLeft: `3px solid ${COLORS[type]}`,
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
    overflow: "hidden",
    position: "relative",
    textAlign: "left",
    font: "inherit",
    fontFamily: FONT,
    fontSize: "13px",
    lineHeight: "1.4",
    transform: offscreenTransform(narrow),
    opacity: REDUCED ? "1" : "0",
    transition: REDUCED
      ? "none"
      : `transform var(--motion-med) cubic-bezier(0.16,1,0.3,1), opacity var(--motion-med) ease, box-shadow var(--motion-fast) ease, border-color var(--motion-fast) ease`,
  });
}

function attachEnter(toast: HTMLElement, icon: SVGSVGElement): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = "none";
      toast.style.opacity = "1";
      icon.style.transform = "scale(1)";
    });
  });
}

function makeIcon(type: ToastKind): SVGSVGElement {
  const icon = createIconSvg(ICONS[type], {
    filled: true,
    className: "fsp-icon",
    size: 20,
  });
  Object.assign(icon.style, {
    color: COLORS[type],
    transition: REDUCED ? "none" : "transform var(--motion-fast) ease",
    transform: "scale(0.6)",
    flexShrink: "0",
  });
  return icon;
}

function scheduleRemove(
  toast: HTMLElement,
  s: HTMLDivElement,
  type: ToastKind,
): void {
  setTimeout(
    () => {
      toast.remove();
      restoreStackPolite(s, type);
      removeStackIfNeeded();
    },
    REDUCED ? 0 : MOTION_MS,
  );
}

export function notify(message: string, type: ToastKind = "info") {
  const s = ensureStack();
  const narrow = isNarrow();
  s.style.alignItems = narrow ? "stretch" : "flex-end";

  const bar = document.createElement("div");
  Object.assign(bar.style, {
    position: "absolute",
    bottom: "0",
    left: "0",
    height: "2px",
    width: "100%",
    transformOrigin: "left",
    background: COLORS[type],
    opacity: "0.55",
    transition: REDUCED ? "none" : "transform 0.05s linear",
  });

  const icon = makeIcon(type);

  const text = document.createElement("span");
  text.textContent = message;
  Object.assign(text.style, { lineHeight: "1.4" });

  const content = document.createElement("div");
  Object.assign(content.style, {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    fontWeight: "500",
  });
  content.append(icon, text);

  const toast = document.createElement("button");
  toast.type = "button";
  toast.className = "fsp-toast-timed";
  toast.setAttribute(
    "aria-label",
    narrow ? `${type}: ${message}. Tap to dismiss` : `${type}: ${message}`,
  );
  if (type === "error") {
    s.setAttribute("aria-live", "assertive");
    toast.setAttribute("role", "alert");
  }
  styleToastShell(toast, type, narrow);
  toast.style.cursor = "pointer";

  toast.addEventListener("mouseenter", () => {
    toast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
    toast.style.borderColor = COLORS[type];
  });
  toast.addEventListener("mouseleave", () => {
    toast.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)";
    toast.style.borderColor = "var(--panel-border)";
  });

  toast.append(content, bar);
  s.append(toast);
  attachEnter(toast, icon);

  let remaining = DURATION;
  let start = Date.now();
  let raf = 0;
  let dismissTimer = 0;

  function tick() {
    const elapsed = Date.now() - start;
    const pct = Math.max(0, 1 - elapsed / remaining);
    bar.style.transform = `scaleX(${pct})`;
    if (elapsed >= remaining) {
      dismiss();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function armTimer() {
    remaining = DURATION;
    start = Date.now();
    bar.style.transform = "scaleX(1)";
    if (REDUCED) {
      clearTimeout(dismissTimer);
      dismissTimer = window.setTimeout(dismiss, DURATION);
      return;
    }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function dismiss() {
    cancelAnimationFrame(raf);
    clearTimeout(dismissTimer);
    toast.style.transform = offscreenTransform(narrow);
    toast.style.opacity = "0";
    scheduleRemove(toast, s, type);
  }

  toast.addEventListener("click", dismiss);
  toast.addEventListener("fsp-toast-dismiss", dismiss);
  // Hover freezes; leave restarts a full DURATION so bar % matches real time left.
  toast.addEventListener("mouseenter", () => {
    cancelAnimationFrame(raf);
    clearTimeout(dismissTimer);
  });
  toast.addEventListener("mouseleave", () => {
    armTimer();
  });

  armTimer();
}

export interface NotifyActionOptions {
  message: string;
  actionLabel: string;
  onAction: () => void | Promise<void>;
  onDismiss?: () => void;
  type?: ToastKind;
}

/** Sticky toast with an explicit action; stays until action succeeds or dismiss. */
export function notifyAction(opts: NotifyActionOptions): {
  dismiss: () => void;
} {
  const type = opts.type ?? "error";
  const s = ensureStack();
  const narrow = isNarrow();
  s.style.alignItems = narrow ? "stretch" : "flex-end";

  const icon = makeIcon(type);

  const text = document.createElement("span");
  text.textContent = opts.message;
  Object.assign(text.style, {
    lineHeight: "1.4",
    fontWeight: "500",
    minWidth: "0",
  });

  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.className = "fsp-toast-dismiss";
  dismissBtn.setAttribute("aria-label", "Dismiss");
  const closeIcon = createIconSvg("close", {
    className: "fsp-icon",
    size: 18,
  });
  dismissBtn.append(closeIcon);
  Object.assign(dismissBtn.style, {
    display: "inline-grid",
    placeItems: "center",
    width: "var(--hit-icon, 32px)",
    height: "var(--hit-icon, 32px)",
    minWidth: "var(--hit-icon, 32px)",
    minHeight: "var(--hit-icon, 32px)",
    margin: "-6px -6px 0 0",
    border: "none",
    borderRadius: "var(--radius-control)",
    background: "transparent",
    color: "var(--panel-text)",
    opacity: "0.55",
    cursor: "pointer",
    padding: "0",
    flexShrink: "0",
  });

  const head = document.createElement("div");
  Object.assign(head.style, {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  });
  head.append(icon, text, dismissBtn);

  const action = document.createElement("button");
  action.type = "button";
  action.className = "fsp-toast-action";
  action.textContent = opts.actionLabel;
  Object.assign(action.style, {
    alignSelf: "flex-start",
    marginLeft: "30px",
    marginTop: "2px",
    padding: "8px 12px",
    minHeight: "var(--hit-control, 32px)",
    borderRadius: "var(--radius-control)",
    border: `1px solid ${COLORS[type]}`,
    background: "transparent",
    color: COLORS[type],
    font: "inherit",
    fontFamily: FONT,
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: REDUCED
      ? "none"
      : "background var(--motion-fast) ease, opacity var(--motion-fast) ease",
  });

  const toast = document.createElement("div");
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.setAttribute("aria-label", `${type}: ${opts.message}`);
  if (type === "error") {
    s.setAttribute("aria-live", "assertive");
  }
  styleToastShell(toast, type, narrow);
  Object.assign(toast.style, {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    paddingRight: "10px",
  });
  toast.append(head, action);
  s.append(toast);
  attachEnter(toast, icon);

  let busy = false;
  let closed = false;

  function dismiss() {
    if (closed) return;
    closed = true;
    toast.removeAttribute("aria-busy");
    toast.style.transform = offscreenTransform(narrow);
    toast.style.opacity = "0";
    opts.onDismiss?.();
    scheduleRemove(toast, s, type);
  }

  dismissBtn.addEventListener("click", dismiss);
  toast.addEventListener("fsp-toast-dismiss", dismiss);

  action.addEventListener("click", () => {
    if (busy || closed) return;
    busy = true;
    action.disabled = true;
    toast.setAttribute("aria-busy", "true");
    void Promise.resolve(opts.onAction())
      .then(() => {
        dismiss();
      })
      .catch(() => {
        busy = false;
        action.disabled = false;
        toast.removeAttribute("aria-busy");
      });
  });

  return { dismiss };
}
