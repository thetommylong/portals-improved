// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { createIconSvg, type IconName } from "./ui/icons";

export type ToastKind = "info" | "success" | "error";

const DURATION = 4000;

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

let stack: HTMLDivElement | null = null;
let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

function ensureStack(): HTMLDivElement {
  if (stack) return stack;

  stack = document.createElement("div");
  stack.setAttribute("role", "status");
  stack.setAttribute("aria-live", "polite");
  stack.setAttribute("aria-relevant", "additions removals");
  Object.assign(stack.style, {
    position: "fixed",
    top: "16px",
    right: "16px",
    zIndex: "2147483",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    pointerEvents: "none",
    fontFamily: "system-ui, -apple-system, sans-serif",
  });
  document.body.append(stack);

  escapeHandler = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !stack?.lastElementChild) return;
    // Let modal dialogs own Escape; don't dismiss a toast underneath them.
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
    const last = stack.lastElementChild as HTMLElement;
    last.dispatchEvent(new Event("fsp-toast-dismiss"));
  };
  document.addEventListener("keydown", escapeHandler);

  return stack;
}

function removeStackIfNeeded() {
  if (stack && stack.children.length === 0) {
    stack.remove();
    stack = null;
    if (escapeHandler) {
      document.removeEventListener("keydown", escapeHandler);
      escapeHandler = null;
    }
  }
}

function styleToastShell(
  toast: HTMLButtonElement | HTMLDivElement,
  type: ToastKind,
): void {
  Object.assign(toast.style, {
    pointerEvents: "auto",
    minWidth: "260px",
    maxWidth: "360px",
    padding: "10px 14px",
    borderRadius: "10px",
    background: "var(--panel-bg)",
    color: "var(--panel-text)",
    border: "1px solid var(--panel-border)",
    borderLeft: `3px solid ${COLORS[type]}`,
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
    overflow: "hidden",
    position: "relative",
    textAlign: "left",
    font: "inherit",
    fontSize: "13px",
    lineHeight: "1.4",
    transform: REDUCED ? "translateX(0)" : "translateX(120%)",
    opacity: REDUCED ? "1" : "0",
    transition: REDUCED
      ? "none"
      : "transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease, box-shadow 0.15s ease, border-color 0.15s ease",
  });
}

function attachEnter(toast: HTMLElement, icon: SVGSVGElement): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = "translateX(0)";
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
    transition: REDUCED ? "none" : "transform 0.25s ease",
    transform: "scale(0.6)",
    flexShrink: "0",
  });
  return icon;
}

export function notify(message: string, type: ToastKind = "info") {
  const s = ensureStack();

  const bar = document.createElement("div");
  Object.assign(bar.style, {
    position: "absolute",
    bottom: "0",
    left: "0",
    height: "3px",
    width: "100%",
    transformOrigin: "left",
    background: COLORS[type],
    opacity: "0.5",
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
    gap: "8px",
    fontSize: "13px",
    fontWeight: "500",
  });
  content.append(icon, text);

  const toast = document.createElement("button");
  toast.type = "button";
  toast.setAttribute("aria-label", `${type}: ${message}`);
  if (type === "error") {
    s.setAttribute("aria-live", "assertive");
    toast.setAttribute("role", "alert");
  }
  styleToastShell(toast, type);
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

  function dismiss() {
    cancelAnimationFrame(raf);
    toast.style.transform = REDUCED ? "translateX(0)" : "translateX(120%)";
    toast.style.opacity = "0";
    setTimeout(
      () => {
        toast.remove();
        if (type === "error" && s) {
          s.removeAttribute("role");
          s.setAttribute("aria-live", "polite");
        }
        removeStackIfNeeded();
      },
      REDUCED ? 0 : 300,
    );
  }

  toast.addEventListener("click", dismiss);
  toast.addEventListener("fsp-toast-dismiss", dismiss);
  toast.addEventListener("mouseenter", () => {
    cancelAnimationFrame(raf);
    remaining -= Date.now() - start;
  });
  toast.addEventListener("mouseleave", () => {
    start = Date.now();
    raf = requestAnimationFrame(tick);
  });

  if (REDUCED) {
    setTimeout(dismiss, DURATION);
  } else {
    raf = requestAnimationFrame(tick);
  }
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

  const icon = makeIcon(type);

  const text = document.createElement("span");
  text.textContent = opts.message;
  Object.assign(text.style, { lineHeight: "1.4", flex: "1" });

  const row = document.createElement("div");
  Object.assign(row.style, {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    fontSize: "13px",
    fontWeight: "500",
  });
  row.append(icon, text);

  const action = document.createElement("button");
  action.type = "button";
  action.textContent = opts.actionLabel;
  Object.assign(action.style, {
    marginTop: "8px",
    marginLeft: "28px",
    padding: "6px 10px",
    borderRadius: "8px",
    border: `1px solid ${COLORS[type]}`,
    background: "transparent",
    color: COLORS[type],
    font: "inherit",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  });

  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.setAttribute("aria-label", "Dismiss");
  dismissBtn.textContent = "×";
  Object.assign(dismissBtn.style, {
    position: "absolute",
    top: "4px",
    right: "6px",
    border: "none",
    background: "transparent",
    color: "var(--panel-text)",
    opacity: "0.55",
    cursor: "pointer",
    fontSize: "16px",
    lineHeight: "1",
    padding: "4px",
  });

  const toast = document.createElement("div");
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.setAttribute("aria-label", `${type}: ${opts.message}`);
  if (type === "error") {
    s.setAttribute("aria-live", "assertive");
  }
  styleToastShell(toast, type);
  toast.append(row, action, dismissBtn);
  s.append(toast);
  attachEnter(toast, icon);

  let busy = false;
  let closed = false;

  function dismiss() {
    if (closed) return;
    closed = true;
    toast.style.transform = REDUCED ? "translateX(0)" : "translateX(120%)";
    toast.style.opacity = "0";
    opts.onDismiss?.();
    setTimeout(
      () => {
        toast.remove();
        if (type === "error" && s) {
          s.removeAttribute("role");
          s.setAttribute("aria-live", "polite");
        }
        removeStackIfNeeded();
      },
      REDUCED ? 0 : 300,
    );
  }

  dismissBtn.addEventListener("click", dismiss);
  toast.addEventListener("fsp-toast-dismiss", dismiss);

  action.addEventListener("click", () => {
    if (busy || closed) return;
    busy = true;
    action.disabled = true;
    action.style.opacity = "0.6";
    void Promise.resolve(opts.onAction())
      .then(() => {
        dismiss();
      })
      .catch(() => {
        busy = false;
        action.disabled = false;
        action.style.opacity = "1";
      });
  });

  return { dismiss };
}
