# ADR 003 — Match-all with lazy boot gate

## Status

Accepted

## Context

Portals may change hosts; mock preview must work off-portal via GM. A single rolled-up bundle forced full parse on every page under `match: *://*/*`.

## Decision

Keep `@match *://*/*`. Entry (`src/index.ts`) only loads the lightweight gate (`adapters/gate.ts`). The shell boots via dynamic `import("./boot")` when `hasLiveAdapter()` or `isMockForced()` is true. URL `?adapter=mock` is ignored on non-portal hosts; GM `portal:adapter=mock` still forces mock anywhere.

## Consequences

Idle pages avoid shell/chat parse cost. Mock-anywhere requires the GM flag (or a live host + query).
