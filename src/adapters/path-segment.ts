// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/**
 * Encode a single URL path segment so `/`, `..`, and other reserved
 * characters cannot rewrite the path via WHATWG URL resolution.
 *
 * `encodeURIComponent` leaves `.` alone, and WHATWG still collapses a
 * decoded `.` / `..` segment — so those values are rejected outright
 * (they are never valid FSP object ids).
 */
export function pathSegment(id: string | number): string {
  const raw = String(id);
  if (raw === "." || raw === "..") {
    throw new Error(`Invalid path segment: ${JSON.stringify(raw)}`);
  }
  return encodeURIComponent(raw);
}
