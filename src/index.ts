// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { createLogger } from "./log";
import { hasLiveAdapter, isMockForced } from "./adapters/gate";

const log = createLogger("index");

if (!hasLiveAdapter() && !isMockForced()) {
  log.log("no supported portal here — staying idle");
} else {
  void import("./boot")
    .then((m) => m.boot())
    .catch((err) => {
      log.error("failed to boot portals-improved:", err);
    });
}
