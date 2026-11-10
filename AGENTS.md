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

The userscript matches **every site** (`match: ['*://*/*']`) but stays a no-op off-portal. Entry only loads a tiny gate (`src/adapters/gate.ts` / `LIVE_HOST_FRAGMENTS` in `hosts.ts`); the shell boots via dynamic `import("./boot")` when `shouldBoot()`. Monkey CSS is queued (`build.cssSideEffects` → `src/css-inject.ts`) and flushed only on boot so idle hosts are not styled. Each adapter declares the host fragments it serves in its own `hosts` field, and `LIVE_ADAPTERS` in `src/adapters/runtime.svelte.ts` is the only runtime registry — also update `LIVE_HOST_FRAGMENTS` when adding a portal. Mock override: GM `portal:adapter` = `"mock"` works anywhere (takes over the page, including CSS strip); `?adapter=mock` is honored only on a live-adapter host.

- `matchesHost(hostname, fragments)` (in `src/sdk/adapter.ts`) treats each fragment as a **DNS label / suffix**, not a bare substring: case-insensitive equality, `fragment.` prefix, `.fragment` suffix, or `.fragment.` middle label. So `fsp` matches `fsp.fpt.edu.vn` but not `xfsp.example.com` / `myfsp.edu.vn`.
- Entry `src/index.ts` auto-discovers every `src/scripts/*.ts` via `import.meta.glob`. Each script exports a default (optionally async) function and optionally `export const portal` (a host fragment) to restrict itself to one portal — matched via `matchesHost`, and bypassed under a forced mock. Nothing needs registering — drop in a file and it loads.
- Scripts initialize concurrently (`Promise.all`); the `NN-` filename prefixes do not sequence execution.
- `src/adapters/` implements the `PortalAdapter` contract from `src/sdk/adapter.ts`: `FspLiveAdapter` talks to https://api.fpt.edu.vn/fsp/api and claims `hosts: ["fsp"]` (auth token scraped at call time from localStorage / `<meta name="Authorization">` / cookie, DTOs in `src/types/portal.ts`), `MockAdapter` fakes it for previews and claims no hosts. UI and SDK only ever call through the abstract adapter, never the concrete classes.
- Chat/agent tools in `src/sdk/registry.ts` expose many adapter methods that the UI never calls — that surface is intentional for the assistant, not dead code.
- UI is Svelte 5 `mount()`ed into the host page; portal styles ship as a `?inline` CSS import.
- Runtime secrets go through GM storage via `src/secrets.ts` (keys prefixed `fsp:`), not `.env`.

## Userscript quirks

- `vite.config.ts` owns match patterns, `run-at: document-start`, and the `grant` list — using a new `GM_*` API means adding it to `grant` or it's undefined at runtime.
- HMR is off (`hmr: false`). Dev flow: `pnpm dev`, install the served userscript once in Violentmonkey/Tampermonkey, then reload the portal page after each change.
- The portal actively fights devtools; `00-devtools.ts` (`export const portal = "fsp"`) neutralizes that at document-start.

## Workflow

- Conventional Commits (`feat:`, `fix:`, scoped e.g. `feat(events):`).
- Issues live in GitHub Issues (`thetommylong/portals-improved`), managed via `gh` — see `docs/agents/issue-tracker.md`.
- Domain docs (`CONTEXT.md`, `docs/adr/`) are created lazily; proceed silently when absent — see `docs/agents/domain.md`.
