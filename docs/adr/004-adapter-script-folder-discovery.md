# ADR 004 — Adapter and script folder discovery

## Status

Accepted

## Context

Live adapters and boot scripts used flat files plus a hand-maintained `LIVE_ADAPTERS` list. Host fragments had to be duplicated into `LIVE_HOST_FRAGMENTS` for the idle gate (ADR 003). Script helpers sat beside numbered entry files (`00-devtools.ts`, `50-portal.ts`), so `boot` globs could not tell entries from helpers.

## Decision

- **Adapters**: one folder per adapter under `src/adapters/` (`fsp/`, `mock/`). Each folder’s `index.ts` default-exports the adapter class. Runtime discovery (`discovery.ts`) eager-globs `adapters/*/index.ts`, skips the mock path and empty-`hosts` adapters when matching live, and keeps `MockAdapter` as the explicit force / fallback. Root keeps `gate`, hosts aggregate, `runtime`, `path-segment`, and discovery.
- **Hosts (gate-safe)**: each live folder ships a tiny `hosts.ts` default-exporting its fragments. Root `hosts.ts` eager-globs `./*/hosts.ts` and flattens into `LIVE_HOST_FRAGMENTS`. Mock omits the file (or would export `[]`). `gate.ts` never imports live/mock adapter bodies.
- **Scripts**: boot globs only `scripts/*/index.ts`. Entry folders are `devtools/` and `portal/`; helpers (e.g. `portal-dom`) live beside `index.ts` in the folder. Drop `NN-` filename prefixes — concurrent `Promise.all` init never relied on them.

## Consequences

Adding a live portal is drop a folder with `index.ts` + `hosts.ts`; no hand registry or second hosts list. Gate stays light for idle `@match *://*/*` pages. Script helpers are not auto-booted. Mock remains a special-case fallback, not a live host match.
