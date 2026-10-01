// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

export const portal = "fsp";

export default function () {
  if (unsafeWindow.__devtoolsPatchActive) return;
  unsafeWindow.__devtoolsPatchActive = true;

  const noop = function () {};
  const _si = unsafeWindow.setInterval.bind(unsafeWindow);

  unsafeWindow.setInterval = function (
    _fn: unknown,
    delay?: number,
    ..._args: unknown[]
  ) {
    return _si(noop, delay ?? 0);
  } as unknown as typeof setInterval;

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
