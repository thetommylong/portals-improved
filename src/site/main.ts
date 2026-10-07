// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

// Demo-site entry: mounts the portal UI against the MockAdapter on a plain
// static page. No userscript manager is involved and no portal host matches,
// so `resolveAdapter` already falls back to the mock — the GM shim below
// covers the persistence + chat surfaces the UI relies on.

import "./gm-shim"; // must run first (module-scope GM reads at import time)
import { mount } from "svelte";
import { runtime } from "../adapters/runtime.svelte";
import PortalShell from "../ui/PortalShell.svelte";
import sharedCss from "../ui/portal/shared.css?inline";

void runtime.adapter.waitForValidSession(60_000).then((userId) => {
  if (userId) boot(userId);
});

function boot(userId: string) {
  const host = document.createElement("div");
  host.id = "fsp-qol-root";
  document.body.replaceChildren(host);

  const style = document.createElement("style");
  style.textContent = sharedCss;
  host.appendChild(style);

  mount(PortalShell, { target: host, props: { userId } });

  void Promise.allSettled([
    document.fonts.load('400 16px "Google Sans Flex"'),
    document.fonts.load('600 16px "Google Sans Flex"'),
    document.fonts.load('900 16px "Google Sans Flex"'),
  ]);
}
