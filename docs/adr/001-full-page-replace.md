# ADR 001 — Full-page portal replace

## Status

Accepted

## Context

The FSP student portal is hostile to overlays (anti-devtools, heavy host CSS). Students need a phone-first Operate shell.

## Decision

The userscript **replaces** `document.body` and strips host stylesheets after session resolve (`src/scripts/50-portal.ts`). It is not a translucent HUD.

## Consequences

Official menu items without a shell surface (dorm attendance, change-password) need escape hatches or later adapters. Performance and a11y are owned entirely by the shell.
