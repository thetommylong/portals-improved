// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { FspLiveAdapter } from "./fsp-live";
import { MockAdapter } from "./mock";
import { matchesHost, type PortalAdapter } from "../sdk/adapter";

const ADAPTER_KEY = "portal:adapter";
const HOST = window.location.hostname;

/** Every live portal adapter. Adding a portal means adding its class here —
 *  the hosts it serves come from the adapter itself, so nothing else in the
 *  codebase needs editing. */
const LIVE_ADAPTERS = [FspLiveAdapter];

function firstMatchingLive(): PortalAdapter | null {
  for (const Adapter of LIVE_ADAPTERS) {
    const adapter = new Adapter();
    if (matchesHost(HOST, adapter.hosts)) return adapter;
  }
  return null;
}

/** Is this a host any live adapter claims? The single gate for whether the
 *  userscript should do anything at all. */
export function hasLiveAdapter(): boolean {
  return firstMatchingLive() !== null;
}

function resolveAdapter(): PortalAdapter {
  const forced =
    new URLSearchParams(window.location.search).get("adapter") ??
    GM_getValue<string>(ADAPTER_KEY, "");
  if (forced === "mock") return new MockAdapter();
  return firstMatchingLive() ?? new MockAdapter();
}

export function isMockForced(): boolean {
  return (
    new URLSearchParams(window.location.search).get("adapter") === "mock" ||
    GM_getValue<string>(ADAPTER_KEY, "") === "mock"
  );
}

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
