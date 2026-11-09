#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong
//
// Vite emits site/index.html under dist-site/site/ with ../assets/ links.
// Static hosts (Cloudflare Pages, etc.) expect dist-site/index.html
// with assets/ beside it.

import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = "dist-site";
const nested = join(root, "site", "index.html");
const flat = join(root, "index.html");

if (!existsSync(nested)) {
  console.error(`missing ${nested} — run pnpm site:build first`);
  process.exit(1);
}

const html = readFileSync(nested, "utf8").replaceAll("../assets/", "assets/");
writeFileSync(flat, html);
rmSync(join(root, "site"), { recursive: true, force: true });
console.log(`wrote ${flat}`);
