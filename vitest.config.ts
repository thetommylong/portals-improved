// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __BUILD__: JSON.stringify({ version: "9.9.9", commit: "test" }),
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
