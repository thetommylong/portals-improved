// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong
// Standalone demo-site build target: same Svelte app, same __BUILD__ define,
// but no userscript wrapper and no GM_* globals (src/site/gm-shim.ts handles
// those). Serves just the UI on mock data.

import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version?: string;
};

function shortCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

const build = { commit: shortCommit(), version: pkg.version ?? '0.0.0' };

export default defineConfig({
  define: {
    __BUILD__: JSON.stringify(build),
  },
  plugins: [
    svelte(),
    {
      // Entry lives at site/index.html; Vite's printed Local URL is still `/`.
      // Rewrite common URLs so `/`, `/index.html`, and `/site` (no slash) work.
      name: 'serve-site-entry',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const raw = req.url ?? '';
          const qIndex = raw.indexOf('?');
          const pathname = qIndex === -1 ? raw : raw.slice(0, qIndex);
          const qs = qIndex === -1 ? '' : raw.slice(qIndex);
          if (
            pathname === '/' ||
            pathname === '/index.html' ||
            pathname === '/site' ||
            pathname === '/site/'
          ) {
            req.url = `/site/index.html${qs}`;
          }
          next();
        });
      },
    },
  ],
  base: './',
  server: {
    open: '/',
  },
  build: {
    outDir: 'dist-site',
    rollupOptions: { input: 'site/index.html' },
  },
});