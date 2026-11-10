// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import monkey from "vite-plugin-monkey";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Keep in sync with `PENDING_CSS_KEY` in `src/css-inject.ts`. */
const PENDING_CSS_KEY = "__portalsImprovedPendingCss";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as {
  version?: string;
};

function shortCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}

const build = { commit: shortCommit(), version: pkg.version ?? "0.0.0" };

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __BUILD__: JSON.stringify(build),
  },
  plugins: [
    svelte(),
    monkey({
      entry: "src/index.ts",
      build: {
        fileName: "script.user.js",
        // Vendor SystemJS into the bundle instead of @require from jsDelivr
        // (no SRI). Dynamic-import chunks still land as System.register modules
        // inside the same .user.js — monkey does not emit separate @resource
        // files for lazy chunks.
        systemjs: "inline",
        // Default cssSideEffects GM_addStyle's the whole CSS graph at entry —
        // before the idle gate — and would paint portal rules onto every
        // @match page (TikTok, etc.). Queue instead; src/index.ts flushes only
        // when shouldBoot() (see src/css-inject.ts / ADR 003).
        // Must be a self-contained expression: monkey stringifies this into the
        // userscript and cannot close over Vite-config imports.
        cssSideEffects: `(css)=>{const k=${JSON.stringify(PENDING_CSS_KEY)};(globalThis[k]??=[]).push(css);}`,
      },
      userscript: {
        namespace: "npm/vite-plugin-monkey",
        match: ["*://*/*"],
        // Wildcard connect kept intentionally (ADR 003). Configurable outbound
        // URLs are hardened at the setter (https:; http: only for loopback).
        connect: ["*"],
        license: "AGPL-3.0-only",
        "run-at": "document-start",
        grant: [
          "GM_addStyle",
          "GM_setValue",
          "GM_getValue",
          "GM_deleteValue",
          "GM_xmlhttpRequest",
          "unsafeWindow",
        ],
      },
    }),
  ],
  server: {
    hmr: false,
  },
});
