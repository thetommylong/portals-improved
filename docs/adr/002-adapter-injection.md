# ADR 002 — Adapter injection for the agent SDK

## Status

Accepted

## Context

Screens read `runtime.adapter` directly. The chat agent/tool registry also needed the adapter and previously imported the runtime singleton, coupling SDK → runtime.

## Decision

- UI screens keep **UI → runtime.adapter** for data.
- `createAgent(context, adapter)` injects the adapter via `setRegistryAdapter`.
- Registry falls back to `runtime.adapter` if no injection is set.

## Consequences

Agent tools stay portal-agnostic in tests; composition root remains `runtime.svelte.ts`.
