// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import monkey from "vite-plugin-monkey";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

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
