// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { createLogger } from "./log";
import { isMockForced } from "./adapters/gate";
import { matchesHost } from "./sdk/adapter";

const log = createLogger("boot");

export async function boot(): Promise<void> {
  console.log(
    `%c portals-improved v${__BUILD__.version} (${__BUILD__.commit}) — AGPL-3.0-only`,
    "color:#cba6f7;font-weight:bold",
  );
  console.log("https://github.com/thetommylong/portals-improved");

  // Side-effect: resolve runtime adapter (live or mock).
  await import("./adapters/runtime.svelte");

  const modules = import.meta.glob("./scripts/*.ts");

  const tasks = Object.entries(modules).map(async ([path, loader]) => {
    const mod = (await loader()) as Record<string, unknown>;
    const scriptPortal = mod.portal as string | undefined;
    if (
      scriptPortal &&
      !isMockForced() &&
      !matchesHost(window.location.hostname, [scriptPortal])
    ) {
      return;
    }

    if (typeof mod.default === "function") {
      try {
        await (mod.default as () => Promise<void>)();
        log.log(`loaded ${path}!`);
      } catch (err) {
        log.error(`failed to initialize ${path}:`, err);
      }
    }
  });

  await Promise.all(tasks);
  log.log("all modules initialized.");
}
