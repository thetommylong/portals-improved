// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PENDING_CSS_KEY,
  discardPendingCss,
  flushPendingCss,
  hasFlushedCss,
  queueMonkeyCss,
  reinjectFlushedCss,
  resetFlushedCssForTests,
  takePendingCss,
} from "./css-inject";

describe("css-inject", () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, PENDING_CSS_KEY);
    resetFlushedCssForTests();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, PENDING_CSS_KEY);
    resetFlushedCssForTests();
    vi.unstubAllGlobals();
  });

  it("queues and takes pending CSS", () => {
    queueMonkeyCss("a{}");
    queueMonkeyCss("b{}");
    expect(takePendingCss()).toEqual(["a{}", "b{}"]);
    expect(takePendingCss()).toEqual([]);
  });

  it("discardPendingCss drops the queue without injecting", () => {
    const addStyle = vi.fn();
    vi.stubGlobal("GM_addStyle", addStyle);
    queueMonkeyCss(".shell{}");
    discardPendingCss();
    expect(addStyle).not.toHaveBeenCalled();
    expect(takePendingCss()).toEqual([]);
  });

  it("flushPendingCss injects via GM_addStyle", () => {
    const el = {
      setAttribute: vi.fn(),
    };
    const addStyle = vi.fn(() => el);
    vi.stubGlobal("GM_addStyle", addStyle);
    queueMonkeyCss(".shell{display:flex}");
    flushPendingCss();
    expect(addStyle).toHaveBeenCalledOnce();
    expect(addStyle).toHaveBeenCalledWith(".shell{display:flex}");
    expect(el.setAttribute).toHaveBeenCalledWith("data-fsp-css", "");
    expect(takePendingCss()).toEqual([]);
    expect(hasFlushedCss()).toBe(true);
  });

  it("marks last head style when GM_addStyle returns void", () => {
    const last = { setAttribute: vi.fn() };
    vi.stubGlobal(
      "GM_addStyle",
      vi.fn(() => undefined),
    );
    vi.stubGlobal("document", {
      head: {
        querySelectorAll: vi.fn(() => [{}, last]),
      },
      documentElement: null,
      createElement: vi.fn(),
    });
    queueMonkeyCss(".a{}");
    flushPendingCss();
    expect(last.setAttribute).toHaveBeenCalledWith("data-fsp-css", "");
  });

  it("reinjectFlushedCss replays remembered chunks", () => {
    const el = { setAttribute: vi.fn() };
    const addStyle = vi.fn(() => el);
    vi.stubGlobal("GM_addStyle", addStyle);
    queueMonkeyCss(".one{}");
    flushPendingCss();
    addStyle.mockClear();
    el.setAttribute.mockClear();
    reinjectFlushedCss();
    expect(addStyle).toHaveBeenCalledWith(".one{}");
    expect(el.setAttribute).toHaveBeenCalledWith("data-fsp-css", "");
  });
});
