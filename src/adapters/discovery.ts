// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { MockAdapter } from "./mock";
import { matchesHost, type PortalAdapter } from "../sdk/adapter";
import { isMockForced } from "./gate";

type AdapterCtor = new () => PortalAdapter;

const adapterModules = import.meta.glob<{ default: AdapterCtor }>(
  "./*/index.ts",
  { eager: true },
);

/** Instantiate live adapters from folder index defaults; skip mock path / empty hosts. */
export function firstMatchingLive(
  hostname = window.location.hostname,
): PortalAdapter | null {
  for (const [path, mod] of Object.entries(adapterModules)) {
    if (!mod.default || path.includes("/mock/")) continue;
    const adapter = new mod.default();
    if (adapter.hosts.length === 0) continue;
    if (matchesHost(hostname, adapter.hosts)) return adapter;
  }
  return null;
}

export function resolveAdapter(
  hostname = window.location.hostname,
): PortalAdapter {
  if (isMockForced()) return new MockAdapter();
  return firstMatchingLive(hostname) ?? new MockAdapter();
}
