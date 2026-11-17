// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { MockAdapter } from "./mock";
import type { PortalAdapter } from "../sdk/adapter";
import { ADAPTER_KEY } from "./gate";
import { firstMatchingLive, resolveAdapter } from "./discovery";

export { hasLiveAdapter, isMockForced } from "./gate";

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
