// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { describe, expect, it } from "vitest";
import { escapeCsvCell, neutralizeCsvFormula } from "./csvCell";

describe("neutralizeCsvFormula", () => {
  it("prefixes spreadsheet formula starters with a single quote", () => {
    expect(neutralizeCsvFormula("=1+1")).toBe("'=1+1");
    expect(neutralizeCsvFormula("+cmd")).toBe("'+cmd");
    expect(neutralizeCsvFormula("-2+3")).toBe("'-2+3");
    expect(neutralizeCsvFormula("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("neutralizes tab- and CR-prefixed formula variants", () => {
    expect(neutralizeCsvFormula('\t=HYPERLINK("http://evil")')).toBe(
      '\'\t=HYPERLINK("http://evil")',
    );
    expect(neutralizeCsvFormula("\r=1+1")).toBe("'\r=1+1");
    expect(neutralizeCsvFormula("\t\r@SUM(A1)")).toBe("'\t\r@SUM(A1)");
  });

  it("neutralizes LF-, space-, and NBSP-prefixed formula variants", () => {
    expect(neutralizeCsvFormula("\n=1+1")).toBe("'\n=1+1");
    expect(neutralizeCsvFormula(" =cmd")).toBe("' =cmd");
    expect(neutralizeCsvFormula("\u00a0@SUM(A1)")).toBe("'\u00a0@SUM(A1)");
  });

  it("leaves normal values unchanged", () => {
    expect(neutralizeCsvFormula("")).toBe("");
    expect(neutralizeCsvFormula("Math")).toBe("Math");
    expect(neutralizeCsvFormula("8.5")).toBe("8.5");
    expect(neutralizeCsvFormula("Đánh giá thường xuyên 1")).toBe(
      "Đánh giá thường xuyên 1",
    );
    expect(neutralizeCsvFormula(" a=b")).toBe(" a=b");
  });
});

describe("escapeCsvCell", () => {
  it("neutralizes then RFC 4180-quotes when needed", () => {
    expect(escapeCsvCell("=1+1")).toBe("'=1+1");
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("=a,b")).toBe('"\'=a,b"');
    expect(escapeCsvCell("plain")).toBe("plain");
  });
});
