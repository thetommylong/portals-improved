// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { FspLiveAdapter } from "./fsp-live";
import { MockAdapter } from "./mock";
import { matchesHost, type PortalAdapter } from "../sdk/adapter";
import { ADAPTER_KEY, isMockForced } from "./gate";
import { LIVE_HOST_FRAGMENTS } from "./hosts";

const HOST = window.location.hostname;

/** Every live portal adapter. Adding a portal means adding its class here —
 *  also update `LIVE_HOST_FRAGMENTS` in `hosts.ts` for the idle gate. */
const LIVE_ADAPTERS = [FspLiveAdapter];

function firstMatchingLive(): PortalAdapter | null {
  for (const Adapter of LIVE_ADAPTERS) {
    const adapter = new Adapter();
    if (matchesHost(HOST, adapter.hosts)) return adapter;
  }
  return null;
}

function resolveAdapter(): PortalAdapter {
  if (isMockForced()) return new MockAdapter();
  return firstMatchingLive() ?? new MockAdapter();
}

export { hasLiveAdapter, isMockForced } from "./gate";
export { LIVE_HOST_FRAGMENTS };

class AdapterRuntime {
  adapter = $state<PortalAdapter>(resolveAdapter());

  setActive(name: "live" | "mock"): void {
    GM_setValue(ADAPTER_KEY, name);
    this.adapter =
      name === "live"
        ? (firstMatchingLive() ?? new MockAdapter())
        : new MockAdapter();
  }
}

export const runtime = new AdapterRuntime();
