// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

export type ToastKind = "info" | "success" | "error";
/** @deprecated Use ToastKind */
export type NotificationType = ToastKind;

const DURATION = 4000;

const ICONS: Record<ToastKind, string> = {
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
    if (e.key === "Escape" && stack && stack.lastElementChild) {
      (stack.lastElementChild as HTMLElement).click();
    }
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

  const icon = document.createElement("span");
  icon.className = "material-symbols-rounded";
  icon.textContent = ICONS[type];
  icon.setAttribute("aria-hidden", "true");
  Object.assign(icon.style, {
    fontFamily: '"Material Symbols Rounded"',
    fontSize: "20px",
    color: COLORS[type],
    lineHeight: "1",
    flexShrink: "0",
    transition: REDUCED ? "none" : "transform 0.25s ease",
    transform: "scale(0.6)",
  });

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
    cursor: "pointer",
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

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = "translateX(0)";
      toast.style.opacity = "1";
      icon.style.transform = "scale(1)";
    });
  });

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
