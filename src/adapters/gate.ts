// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { matchesHost } from "../sdk/adapter";
import { LIVE_HOST_FRAGMENTS } from "./hosts";

const ADAPTER_KEY = "portal:adapter";

/**
 * `window.name` for the SSO popup opened by `FspLiveAdapter.reauthenticate`.
 * Survives same-window IdP redirects; gate must stay idle so the shell does
 * not `replaceChildren` over the portal login page in that popup.
 */
export const REAUTH_POPUP_NAME = "fsp-reauth";

/** Lightweight host gate — safe to import from the userscript entry before
 *  loading the shell/adapters bundle. */
export function hasLiveAdapter(): boolean {
  return matchesHost(window.location.hostname, LIVE_HOST_FRAGMENTS);
}

/** True inside the named reauth popup (opener sets `window.name`). */
export function isReauthPopup(): boolean {
  return window.name === REAUTH_POPUP_NAME;
}

/**
 * Mock override. GM storage always wins. The `?adapter=mock` query param is
 * honored only on a live-adapter host so arbitrary pages cannot force the
 * shell via a crafted URL (DESIGN.md / security remediation).
 */
export function isMockForced(): boolean {
  if (GM_getValue<string>(ADAPTER_KEY, "") === "mock") return true;
  if (new URLSearchParams(window.location.search).get("adapter") !== "mock") {
    return false;
  }
  return hasLiveAdapter();
}

/** Whether the shell (and deferred userscript CSS) should load on this page. */
export function shouldBoot(): boolean {
  if (isReauthPopup()) return false;
  return hasLiveAdapter() || isMockForced();
}

export { ADAPTER_KEY };
