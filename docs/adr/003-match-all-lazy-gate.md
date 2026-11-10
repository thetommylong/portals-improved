# ADR 003 — Match-all with lazy boot gate

## Status

Accepted

## Context

Portals may change hosts; mock preview must work off-portal via GM. A single rolled-up bundle forced full parse on every page under `match: *://*/*`.

## Decision

Keep `@match *://*/*`. Entry (`src/index.ts`) only loads the lightweight gate (`adapters/gate.ts`). The shell boots via dynamic `import("./boot")` when `shouldBoot()` (`hasLiveAdapter()` or `isMockForced()`) is true. URL `?adapter=mock` is ignored on non-portal hosts; GM `portal:adapter=mock` still forces mock anywhere.

vite-plugin-monkey concatenates all Svelte CSS into the userscript entry and would `GM_addStyle` it before the gate. `build.cssSideEffects` queues that CSS (`src/css-inject.ts`); the entry flushes on boot and discards on idle so off-portal hosts stay a true no-op. Intentional mock-anywhere still loads CSS and may replace the page (ADR 001).

## Consequences

Idle pages avoid shell/chat parse cost **and** host-CSS pollution from portal styles. Mock-anywhere requires the GM flag (or a live host + query); leaving `portal:adapter=mock` set will take over every site until cleared.

Wildcard `@connect *` is kept so `GM_xmlhttpRequest` can reach configurable LLM bases and portal APIs without a host allowlist (hosts change; mock/dev targets vary). Mitigations: (1) Scheme policy via `validateOutboundUrl` on setters **and** `getBaseUrl` (stale evil stored URLs are cleared and fall back to the default). (2) `/url` prompts with `needsNonDefaultHostConfirm` before saving a non-default host. (3) SystemJS is inlined (`build.systemjs: "inline"`) so the bundle does not `@require` jsDelivr without SRI. vite-plugin-monkey still concatenates lazy `System.register` chunks into one `.user.js`, so dynamic `import()` delays *execution* of ChatSidebar/marked/DOMPurify (and nav views), not download/parse of those module texts.
