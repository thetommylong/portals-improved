// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/**
 * Encode a single URL path segment so `/`, `..`, and other reserved
 * characters cannot rewrite the path via WHATWG URL resolution.
 */
export function pathSegment(id: string | number): string {
  return encodeURIComponent(String(id));
}
