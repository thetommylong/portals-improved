// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PENDING_CSS_KEY,
  discardPendingCss,
  flushPendingCss,
  queueMonkeyCss,
  takePendingCss,
} from "./css-inject";

describe("css-inject", () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, PENDING_CSS_KEY);
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, PENDING_CSS_KEY);
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
    const addStyle = vi.fn();
    vi.stubGlobal("GM_addStyle", addStyle);
    queueMonkeyCss(".shell{display:flex}");
    flushPendingCss();
    expect(addStyle).toHaveBeenCalledOnce();
    expect(addStyle).toHaveBeenCalledWith(".shell{display:flex}");
    expect(takePendingCss()).toEqual([]);
  });
});
