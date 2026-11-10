// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { createLogger } from "./log";
import { shouldBoot } from "./adapters/gate";
import { discardPendingCss, flushPendingCss } from "./css-inject";

const log = createLogger("index");

if (!shouldBoot()) {
  // Monkey queues CSS at entry; never inject it on idle hosts.
  discardPendingCss();
  log.log("no supported portal here — staying idle");
} else {
  flushPendingCss();
  void import("./boot")
    .then((m) => m.boot())
    .catch((err) => {
      log.error("failed to boot portals-improved:", err);
    });
}
