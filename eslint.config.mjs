// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import svelteConfig from "./svelte.config.js";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "dist-site/",
      "tmp/",
      "node_modules/",
      "*.config.*",
      ".ua/",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs["flat/recommended"],
  ...svelte.configs["flat/prettier"],
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        __BUILD__: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      // Existing UI uses plain Map/Set in $state; SvelteMap migration is out of scope.
      "svelte/prefer-svelte-reactivity": "off",
      "no-useless-assignment": "off",
      // Chat markdown is sanitized with DOMPurify before {@html}.
      "svelte/no-at-html-tags": "off",
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: tseslint.parser,
        svelteConfig,
      },
    },
  },
);
