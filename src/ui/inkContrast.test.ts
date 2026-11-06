// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";

const FORBIDDEN = /color:\s*var\(--(green|yellow|red)\)/;

const sources = import.meta.glob(["./**/*.css", "./**/*.svelte"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("Latte ink contrast", () => {
  it("forbids raw green/yellow/red as text color under src/ui", () => {
    const hits: string[] = [];
    for (const [path, source] of Object.entries(sources)) {
      source.split(/\r?\n/).forEach((line, index) => {
        if (FORBIDDEN.test(line)) {
          hits.push(`${path}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});
