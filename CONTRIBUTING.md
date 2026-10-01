# Contributing

Thanks for your interest in Portals Improved.

## Project conventions

- **Commits**: Conventional Commits, concise subject (`feat:`, `fix:`, `refactor:`, `docs:`, `ci:`), optional scope (`feat(events):`).
- **Verify before submitting**: `pnpm lint`, then `pnpm check`, then `pnpm build` — in that order. Both halves of `pnpm check` (svelte-check *and* the `vite.config.ts` pass) must be clean.
- **Architecture**: UI and SDK talk only to the `PortalAdapter` contract in `src/sdk/adapter.ts`, never to a concrete adapter directly. New features go through the contract so every portal — and the mock — stays usable for previews.
- **Portable by default**: don't put portal-specific behavior in the shell. If FSP needs something another portal won't, gate it behind `AdapterFeatures` and implement it in that portal's adapter.
- **New portal**: implement the contract, set `features` honestly, register the host in `src/site.ts`, and ship a mock twin. Highest-value contribution here.
- **New scripts**: drop a file in `src/scripts/` — they're auto-discovered via `import.meta.glob`. Export a default function and, if it's site-specific, `export const site`.
- **New GM APIs**: `vite.config.ts` owns the `grant` list. Using an ungranted `GM_*` API means `undefined` at runtime.

## Building locally

Requires the pinned toolchain: **pnpm**, **Node 22**.

```bash
pnpm install
pnpm dev          # serves the userscript for local install
pnpm build        # emits dist/script.user.js
```

HMR is off (`hmr: false` in `vite.config.ts`) — install the served script once in your userscript manager, then reload the portal page after each change.

Preview the UI against fake data anywhere with `?adapter=mock` — no portal account needed.

## Opening a PR

1. Open an issue first describing the change (or scope the PR to an existing issue).
2. Branch from `main`, make focused commits.
3. Ensure `pnpm lint`, `pnpm check`, and `pnpm build` all pass.
4. Open the PR against `main`.

## Issue tracker

Issues and specs live as GitHub Issues. See [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) for the conventions the CLI-driven skills use.