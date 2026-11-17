// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { mount } from "svelte";
import { runtime } from "../../adapters/runtime.svelte";
import PortalShell from "../../ui/PortalShell.svelte";
import { hasFlushedCss, reinjectFlushedCss } from "../../css-inject";
import sharedCss from "../../ui/portal/shared.css?inline";
import {
  hasOwnStyleInHead,
  reinjectStyleElements,
  stripHostStylesheets,
  takeOwnStyleElements,
  whenDocumentBodyReady,
} from "./portal-dom";

export default function () {
  void runtime.adapter.waitForValidSession(60_000).then((userId) => {
    if (!userId) return;
    boot(userId);
  });
}

function boot(userId: string) {
  whenDocumentBodyReady(() => {
    const host = document.createElement("div");
    host.id = "fsp-qol-root";

    document.body.replaceChildren(host);

    // The shell replaces the whole document, so no host stylesheet is wanted:
    // drop every <link rel="stylesheet"> and inline <style> from <head> — the
    // portal's own rules, but also a mock host's styling (e.g. example.com's
    // `html{color-scheme:light dark}` + `body{...text-align:center}`) which
    // would otherwise inherit into the shell. Our own CSS survives: serve mode
    // tags chunks with `data-vite-dev-id`, production with `data-fsp-css` —
    // detach those nodes, strip the rest, re-attach the same elements (keeps
    // Vite HMR sheetsMap valid). Orphan `@import` sheets with null ownerNode
    // are disabled inside stripHostStylesheets.
    //
    // First login can wipe our styles during waitForValidSession; reload then
    // works because CSS is flushed again onto a clean head. If takeOwn finds
    // nothing, replay the gate-time flush from memory.
    const ownStyles = takeOwnStyleElements();
    stripHostStylesheets();
    reinjectStyleElements(ownStyles);
    if (!hasOwnStyleInHead() && hasFlushedCss()) {
      reinjectFlushedCss();
    }

    // Cut remaining host document loads (parser / late assets). New requests
    // started afterward still run: PortalShell injects its font <link>s and
    // `document.fonts.load` below after this call, so shell fonts/CSS do not
    // depend on in-flight host loads that stop() aborts. Keep stop() — ADR 001
    // replace is meant to abandon the portal page, not race it.
    window.stop();

    const style = document.createElement("style");
    style.textContent = sharedCss;
    host.appendChild(style);

    mount(PortalShell, { target: host, props: { userId } });

    // FontFaceSet.load rejects if a face fails; allSettled so one miss is fine.
    void Promise.allSettled([
      document.fonts.load('400 16px "Google Sans Flex"'),
      document.fonts.load('600 16px "Google Sans Flex"'),
      document.fonts.load('700 16px "Google Sans Flex"'),
    ]);
  });
}
