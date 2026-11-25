# portals-improved

Userscript for the FSP portal (fsp.fpt.edu.vn). Svelte 5 + TypeScript + Vite + vite-plugin-monkey. pnpm, Node 22.

## Commands

Verify changes in CI's order: `pnpm lint` → `pnpm check` → `pnpm test` → `pnpm build` (CI also runs `pnpm site:build`).

- `pnpm check` — svelte-check plus a separate `tsc` pass over `vite.config.ts`; both must pass.
- `pnpm test` — Vitest unit tests under `src/**/*.test.ts`.
- `pnpm build` — emits the userscript to `dist/`.
- Formatting runs inside ESLint (prettier plugin), so use `pnpm lint:fix` — there is no standalone format script.
- CI runs on push/PR to `main` and on `workflow_dispatch`.

## Architecture

The userscript matches **every site** (`match: ['*://*/*']`) but stays a no-op off-portal. Entry only loads a tiny gate (`src/adapters/gate.ts` / `LIVE_HOST_FRAGMENTS` aggregated in `hosts.ts`); the shell boots via dynamic `import("./boot")` when `shouldBoot()`. Monkey CSS is queued (`build.cssSideEffects` → `src/css-inject.ts`) and flushed only on boot so idle hosts are not styled. Mock override: GM `portal:adapter` = `"mock"` works anywhere (takes over the page, including CSS strip); `?adapter=mock` is honored only on a live-adapter host. See ADR 003 (lazy gate) and ADR 004 (folder discovery).

- `matchesHost(hostname, fragments)` (in `src/sdk/adapter.ts`) treats each fragment as a **DNS label / suffix**, not a bare substring: case-insensitive equality, `fragment.` prefix, `.fragment` suffix, or `.fragment.` middle label. So `fsp` matches `fsp.fpt.edu.vn` but not `xfsp.example.com` / `myfsp.edu.vn`.
- **Adapters**: one folder per adapter under `src/adapters/` (`fsp/`, `mock/`). `index.ts` default-exports the class. `discovery.ts` globs `adapters/*/index.ts` for live match (skips mock path / empty `hosts`); `MockAdapter` is the explicit force / fallback — no hand-maintained live array. Live folders also export a tiny `hosts.ts`; root `hosts.ts` eager-globs `./*/hosts.ts` into `LIVE_HOST_FRAGMENTS` so the gate never imports adapter bodies. Root keeps `gate`, hosts aggregate, `runtime`, `path-segment`, discovery.
- **Scripts**: `src/boot.ts` globs only `scripts/*/index.ts` (e.g. `devtools/`, `portal/`). Helpers sit beside `index.ts` in the folder (e.g. `portal/portal-dom.ts`) and are not auto-booted. Each entry exports a default (optionally async) function and optionally `export const portal` (host fragment) — matched via `matchesHost`, bypassed under forced mock. Drop a folder with `index.ts` and it loads; no registry.
- Scripts initialize concurrently (`Promise.all`); folder names do not sequence execution.
- `FspLiveAdapter` (`adapters/fsp/`) talks to https://api.fpt.edu.vn/fsp/api via page `fetch` (portal CORS) and claims `hosts: ["fsp"]` (auth token scraped at call time from localStorage / `<meta name="Authorization">` / cookie, DTOs in `src/types/portal.ts`). `MockAdapter` fakes it for previews and claims no hosts. UI and SDK only ever call through the abstract adapter, never the concrete classes. `compactToolResult` is adapter-owned (FSP helpers in `fsp-tool-compact.ts`) so LLM transcripts stay small without baking portal DTO shapes into the SDK executor.
- Chat/agent tools in `src/sdk/registry.ts` expose many adapter methods that the UI never calls — that surface is intentional for the assistant, not dead code.
- UI is Svelte 5 `mount()`ed into the host page; portal styles ship as a `?inline` CSS import. Soft target ~300 lines per whole `.svelte` file (over OK when reasonable). Shell chrome lives in `ShellHeader` / `ShellSettings` / `ShellSidebar` / `ShellChatRail` + `PortalShell.layout.css`; lazy nav chunks + `viewChunkPending` live in `shellViewRegistry`; marks predictor splits `PredictorList` / `PredictorDetail` (+ companion CSS) under a thin `PredictorDrawer`; `PortalShell.svelte` keeps orchestration.
- Runtime secrets and shell prefs go through GM storage via `src/secrets.ts` / `gmPrefs.ts` (short keys; legacy `fsp:` migrated once). Portal list/schedule/marks caches use page `localStorage` under `pi:cache:*` (`pageCache.ts`), not GM.

## Userscript quirks

- `vite.config.ts` owns match patterns, `run-at: document-start`, and the `grant` list — using a new `GM_*` API means adding it to `grant` or it's undefined at runtime.
- HMR is off (`hmr: false`). Dev flow: `pnpm dev`, install the served userscript once in Violentmonkey/Tampermonkey, then reload the portal page after each change.
- The portal actively fights devtools; `scripts/devtools` (`export const portal = "fsp"`) neutralizes that at document-start.

## Workflow

- Conventional Commits (`feat:`, `fix:`, scoped e.g. `feat(events):`).
- Issues live in GitHub Issues (`thetommylong/portals-improved`), managed via `gh` — see `docs/agents/issue-tracker.md`.
- Domain docs (`CONTEXT.md`, `docs/adr/`) are created lazily; proceed silently when absent — see `docs/agents/domain.md`.
