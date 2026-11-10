// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  VITE_CSS_MARKER,
  captureOwnViteCss,
  reinjectCssText,
  stripHostStylesheets,
  whenDocumentBodyReady,
} from "./portal-dom";

type FakeStyleSheet = { disabled: boolean };

function asDoc(value: unknown): Document {
  return value as Document;
}

function fakeStyle(css: string) {
  return {
    textContent: css,
    remove: vi.fn(),
  };
}

function fakeHead(nodes: { remove: ReturnType<typeof vi.fn> }[]) {
  return {
    querySelectorAll: vi.fn(() => nodes),
    appendChild: vi.fn(),
  };
}

describe("whenDocumentBodyReady", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("runs synchronously when body already exists", () => {
    const fn = vi.fn();
    const doc = {
      body: {},
      readyState: "loading",
      addEventListener: vi.fn(),
      documentElement: {},
    };

    whenDocumentBodyReady(fn, asDoc(doc));

    expect(fn).toHaveBeenCalledOnce();
    expect(doc.addEventListener).not.toHaveBeenCalled();
  });

  it("waits for DOMContentLoaded while readyState is loading", () => {
    const fn = vi.fn();
    let dcl: EventListener | null = null;
    const doc = {
      body: null as unknown,
      readyState: "loading",
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        if (type === "DOMContentLoaded") dcl = listener;
      }),
      documentElement: {},
    };

    whenDocumentBodyReady(fn, asDoc(doc));

    expect(fn).not.toHaveBeenCalled();
    expect(dcl).toBeTypeOf("function");

    doc.body = {};
    dcl!(new Event("DOMContentLoaded"));
    expect(fn).toHaveBeenCalledOnce();
  });

  it("runs on microtask when DCL already fired (interactive, body present)", async () => {
    const fn = vi.fn();
    const doc = {
      body: null as unknown,
      readyState: "interactive",
      addEventListener: vi.fn(),
      documentElement: {},
    };

    whenDocumentBodyReady(fn, asDoc(doc));
    expect(fn).not.toHaveBeenCalled();
    expect(doc.addEventListener).not.toHaveBeenCalled();

    doc.body = {};
    await Promise.resolve();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("observes for body when past loading and body is still missing", async () => {
    const fn = vi.fn();
    const observers: {
      trigger: () => void;
      disconnect: ReturnType<typeof vi.fn>;
    }[] = [];
    class FakeMO {
      disconnect = vi.fn();
      observe = vi.fn();
      takeRecords = () => [];
      constructor(private readonly cb: MutationCallback) {
        observers.push({
          trigger: () => this.cb([], this as unknown as MutationObserver),
          disconnect: this.disconnect,
        });
      }
    }
    vi.stubGlobal("MutationObserver", FakeMO);

    const doc = {
      body: null as unknown,
      readyState: "complete",
      addEventListener: vi.fn(),
      documentElement: {},
    };

    whenDocumentBodyReady(fn, asDoc(doc));
    await Promise.resolve();
    expect(fn).not.toHaveBeenCalled();
    expect(observers).toHaveLength(1);

    doc.body = {};
    observers[0]!.trigger();
    expect(fn).toHaveBeenCalledOnce();
    expect(observers[0]!.disconnect).toHaveBeenCalledOnce();
  });
});

describe("stylesheet strip / reinject", () => {
  it("captureOwnViteCss keeps only vite-marked style text", () => {
    const nodes = [
      fakeStyle("body{color:red}"),
      fakeStyle(`${VITE_CSS_MARKER}1 .shell{}`),
      fakeStyle(`${VITE_CSS_MARKER}2 .card{}`),
    ];
    const doc = {
      head: { querySelectorAll: vi.fn(() => nodes) },
    };

    expect(captureOwnViteCss(asDoc(doc))).toEqual([
      `${VITE_CSS_MARKER}1 .shell{}`,
      `${VITE_CSS_MARKER}2 .card{}`,
    ]);
  });

  it("stripHostStylesheets removes DOM owners and disables orphan sheets", () => {
    const link = { remove: vi.fn() };
    const hostStyle = { remove: vi.fn() };
    const head = fakeHead([link, hostStyle]);
    const orphanImport: FakeStyleSheet = { disabled: false };
    const uaSheet: FakeStyleSheet = { disabled: false };

    const doc = {
      head,
      styleSheets: [orphanImport, uaSheet],
    };

    stripHostStylesheets(asDoc(doc));

    expect(head.querySelectorAll).toHaveBeenCalledWith(
      'link[rel="stylesheet"], style',
    );
    expect(link.remove).toHaveBeenCalledOnce();
    expect(hostStyle.remove).toHaveBeenCalledOnce();
    expect(orphanImport.disabled).toBe(true);
    expect(uaSheet.disabled).toBe(true);
  });

  it("stripHostStylesheets ignores sheets that throw on disable", () => {
    const head = fakeHead([]);
    const bad = {
      get disabled() {
        return false;
      },
      set disabled(_v: boolean) {
        throw new Error("cross-origin");
      },
    };
    const doc = {
      head,
      styleSheets: [bad],
    };

    expect(() => stripHostStylesheets(asDoc(doc))).not.toThrow();
  });

  it("reinjectCssText appends style tags after strip", () => {
    const appended: { textContent: string | null }[] = [];
    const head = {
      appendChild: vi.fn((el: { textContent: string | null }) => {
        appended.push(el);
      }),
    };
    const createElement = vi.fn((tag: string) => {
      expect(tag).toBe("style");
      return { textContent: null };
    });
    const doc = { head, createElement };

    reinjectCssText(
      [`${VITE_CSS_MARKER}.a{}`, `${VITE_CSS_MARKER}.b{}`],
      asDoc(doc),
    );

    expect(createElement).toHaveBeenCalledTimes(2);
    expect(appended.map((el) => el.textContent)).toEqual([
      `${VITE_CSS_MARKER}.a{}`,
      `${VITE_CSS_MARKER}.b{}`,
    ]);
  });
});
