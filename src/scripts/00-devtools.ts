// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

export const portal = "fsp";

/**
 * Narrow anti-devtools interval heuristic.
 *
 * Matches known library / detector markers (disable-devtool's
 * `ondevtoolclose` / `DisableDevtool`, `devtoolsDetector`, or an explicit
 * `debugger` statement in the callback source). Does **not** blank every
 * short timer or anything that merely mentions "devtools".
 *
 * Residual risk: a heavily obfuscated detector whose stringified source
 * lacks these tokens will still run; a legitimate callback that embeds the
 * same tokens would be nooped (unlikely). Not smoke-tested against live FSP
 * in this change — verify on-portal if anti-devtools behavior regresses.
 */
const ANTI_DEVTOOLS_RE =
  /ondevtool(?:open|close)|disable[-_]?devtool|DisableDevtool|devtoolsDetector|(?:^|[^\w$])debugger(?:;|\s|$)/;

function looksLikeAntiDevtools(fn: unknown): boolean {
  if (typeof fn === "string") return ANTI_DEVTOOLS_RE.test(fn);
  if (typeof fn !== "function") return false;
  try {
    return ANTI_DEVTOOLS_RE.test(Function.prototype.toString.call(fn));
  } catch {
    // Native / cross-realm functions: leave them alone.
    return false;
  }
}

export default function () {
  if (unsafeWindow.__devtoolsPatchActive) return;
  unsafeWindow.__devtoolsPatchActive = true;

  const noop = function () {};
  const _si = unsafeWindow.setInterval.bind(unsafeWindow);

  unsafeWindow.setInterval = function (
    fn: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ) {
    if (looksLikeAntiDevtools(fn)) {
      return _si(noop, delay ?? 0);
    }
    return _si(fn, delay ?? 0, ...(args as []));
  } as typeof setInterval;

  unsafeWindow.close = noop;

  try {
    const lp = Object.getPrototypeOf(unsafeWindow.location);
    const ld = Object.getOwnPropertyDescriptor(lp, "href");
    if (ld && ld.set) {
      const hs = ld.set;
      Object.defineProperty(unsafeWindow.location, "href", {
        set(u: string) {
          if (/disable-devtool/i.test(u)) return;
          hs.call(unsafeWindow.location, u);
        },
        get() {
          return ld.get ? ld.get.call(unsafeWindow.location) : "";
        },
        configurable: true,
      });
    }
  } catch {
    // noop
  }

  try {
    const pageHistory = unsafeWindow.history;
    const _pushState = pageHistory.pushState.bind(pageHistory);
    pageHistory.pushState = function (
      state: unknown,
      title: string,
      url?: string | URL | null,
    ) {
      if (url && /disable-devtool/i.test(String(url))) return;
      return _pushState(state, title, url);
    };
    const _replaceState = pageHistory.replaceState.bind(pageHistory);
    pageHistory.replaceState = function (
      state: unknown,
      title: string,
      url?: string | URL | null,
    ) {
      if (url && /disable-devtool/i.test(String(url))) return;
      return _replaceState(state, title, url);
    };
  } catch {
    // noop
  }

  try {
    const _assign = unsafeWindow.location.assign.bind(unsafeWindow.location);
    Object.defineProperty(unsafeWindow.location, "assign", {
      value(url: string) {
        if (/disable-devtool/i.test(url)) return;
        return _assign(url);
      },
    });
  } catch {
    // noop
  }

  unsafeWindow.document.addEventListener(
    "keydown",
    function (e) {
      if (
        e.key === "F12" ||
        (e.ctrlKey &&
          e.shiftKey &&
          ["I", "J", "C", "i", "j", "c"].includes(e.key)) ||
        (e.ctrlKey && e.key === "U")
      ) {
        e.stopPropagation();
      }
    },
    true,
  );

  unsafeWindow.document.addEventListener(
    "contextmenu",
    function (e) {
      e.stopPropagation();
    },
    true,
  );
}
