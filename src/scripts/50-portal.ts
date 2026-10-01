// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { mount } from "svelte";
import { runtime } from "../adapters/runtime.svelte";
import PortalShell from "../ui/PortalShell.svelte";
import sharedCss from "../ui/portal/shared.css?inline";

export default function () {
  void runtime.adapter.waitForValidSession(60_000).then((userId) => {
    if (!userId) return;
    boot(userId);
  });
}

function boot(userId: string) {
  const start = () => {
    const host = document.createElement("div");
    host.id = "fsp-qol-root";

    document.body.replaceChildren(host);

    // Drop the portal's own stylesheet(s) from <head> so their 8k+ rules stop
    // bleeding into the app chrome. Only same-origin/relative <link rel="stylesheet">
    // (e.g. `styles-W27TWSNY.css`) are removed — absolute links like the Google
    // Fonts sheet and the userscript's own injected <style> blocks are kept.
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute("href") ?? "";
      if (/^https?:\/\//.test(href) || href.startsWith("//")) return;
      link.remove();
    });

    window.stop();

    const style = document.createElement("style");
    style.textContent = sharedCss;
    host.appendChild(style);

    mount(PortalShell, { target: host, props: { userId } });

    void Promise.allSettled([
      document.fonts.load('400 16px "Google Sans Flex"'),
      document.fonts.load('600 16px "Google Sans Flex"'),
      document.fonts.load('900 16px "Google Sans Flex"'),
    ]);
  };

  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start);
  }
}
