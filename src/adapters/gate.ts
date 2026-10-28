// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { matchesHost } from "../sdk/adapter";
import { LIVE_HOST_FRAGMENTS } from "./hosts";

const ADAPTER_KEY = "portal:adapter";

/** Lightweight host gate — safe to import from the userscript entry before
 *  loading the shell/adapters bundle. */
export function hasLiveAdapter(): boolean {
  return matchesHost(window.location.hostname, LIVE_HOST_FRAGMENTS);
}

/**
 * Mock override. GM storage always wins. The `?adapter=mock` query param is
 * honored only on a live-adapter host so arbitrary pages cannot force the
 * shell via a crafted URL (DESIGN-SPEC / security remediation).
 */
export function isMockForced(): boolean {
  if (GM_getValue<string>(ADAPTER_KEY, "") === "mock") return true;
  if (new URLSearchParams(window.location.search).get("adapter") !== "mock") {
    return false;
  }
  return hasLiveAdapter();
}

export { ADAPTER_KEY };
