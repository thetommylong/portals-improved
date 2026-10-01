# portals-improved

Userscript for the FSP portal (fsp.fpt.edu.vn). Svelte 5 + TypeScript + Vite + vite-plugin-monkey. pnpm, Node 22.

## Commands

No test suite exists. Verify changes in CI's order: `pnpm lint` → `pnpm check` → `pnpm build`.

- `pnpm check` — svelte-check plus a separate `tsc` pass over `vite.config.ts`; both must pass.
- `pnpm build` — emits the userscript to `dist/`.
- Formatting runs inside ESLint (prettier plugin), so use `pnpm lint:fix` — there is no standalone format script.
- CI runs only on `workflow_dispatch`; it never runs on push.

## Architecture

The userscript matches **every site** (`match: ['*://*/*']`) but stays a no-op off-portal. Each adapter declares the host fragments it serves in its own `hosts` field, and `LIVE_ADAPTERS` in `src/adapters/runtime.svelte.ts` is the only registry — adding a portal means adding its class there and nothing else. `hasLiveAdapter()` is the gate; `src/index.ts` bails when nothing matches. The `?adapter=mock` URL param (or GM `portal:adapter` = "mock") overrides the gate so the shell can be previewed anywhere.

- Entry `src/index.ts` auto-discovers every `src/scripts/*.ts` via `import.meta.glob`. Each script exports a default (optionally async) function and optionally `export const portal` (a host fragment) to restrict itself to one portal — matched via `matchesHost` from `src/sdk/adapter.ts`, and bypassed under a forced mock. Nothing needs registering — drop in a file and it loads.
- Scripts initialize concurrently (`Promise.all`); the `NN-` filename prefixes do not sequence execution.
- `src/adapters/` implements the `PortalAdapter` contract from `src/sdk/adapter.ts`: `FspLiveAdapter` talks to https://api.fpt.edu.vn/fsp/api and claims `hosts: ["fsp"]` (auth token scraped at call time from localStorage / `<meta name="Authorization">` / cookie, DTOs in `src/types/portal.ts`), `MockAdapter` fakes it for previews and claims no hosts. UI and SDK only ever call through the abstract adapter, never the concrete classes.
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
