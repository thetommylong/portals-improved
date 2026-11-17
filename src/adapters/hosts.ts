// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

/** Eager per-folder hosts — gate stays free of live/mock adapter bodies. */
const hostModules = import.meta.glob<{ default: readonly string[] }>(
  "./*/hosts.ts",
  { eager: true },
);

export const LIVE_HOST_FRAGMENTS = Object.values(hostModules).flatMap(
  (mod) => mod.default,
);
