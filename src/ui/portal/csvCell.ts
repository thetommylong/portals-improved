// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Spreadsheet formula / DDE prefixes, optionally preceded by tab or CR. */
const CSV_FORMULA_PREFIX = /^[\t\r]*[=+\-@]/;

/**
 * Neutralize CSV formula injection by prefixing dangerous cells with `'`.
 * Covers `=`, `+`, `-`, `@`, and tab/CR-prefixed variants (OWASP CSV injection).
 */
export function neutralizeCsvFormula(value: string): string {
  if (CSV_FORMULA_PREFIX.test(value)) {
    return `'${value}`;
  }
  return value;
}

function rfc4180Escape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Neutralize formula prefixes, then apply RFC 4180 quoting. */
export function escapeCsvCell(value: string): string {
  return rfc4180Escape(neutralizeCsvFormula(value));
}
