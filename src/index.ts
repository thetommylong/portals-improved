// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { createLogger } from "./log";
import { hasLiveAdapter, isMockForced } from "./adapters/runtime.svelte";
import { matchesHost } from "./sdk/adapter";

const log = createLogger("index");

if (!hasLiveAdapter() && !isMockForced()) {
  log.log("no supported portal here — staying idle");
} else {
  console.log(
    `%c portals-improved v${__BUILD__.version} (${__BUILD__.commit}) — AGPL-3.0-only`,
    "color:#cba6f7;font-weight:bold",
  );
  console.log("https://github.com/thetommylong/portals-improved");

  const modules = import.meta.glob("./scripts/*.ts", { eager: true });

  async function initAll() {
    const tasks = Object.entries(modules).map(async ([path, mod]) => {
      const m = mod as Record<string, unknown>;

      // Scripts may opt into a single portal. Under a forced mock every script
      // runs, so the whole shell can be previewed on any host.
      const scriptPortal = m.portal as string | undefined;
      if (
        scriptPortal &&
        !isMockForced() &&
        !matchesHost(window.location.hostname, [scriptPortal])
      ) {
        return;
      }

      if (typeof m.default === "function") {
        try {
          await (m.default as () => Promise<void>)();
          log.log(`loaded ${path}!`);
        } catch (err) {
          log.error(`failed to initialize ${path}:`, err);
        }
      }
    });

    await Promise.all(tasks);
    log.log("all modules initialized.");
  }

  void initAll();
}
