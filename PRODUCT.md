# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

FPT University students using the FSP student portal (`fsp.fpt.edu.vn`), often on a phone. Primary jobs: check today’s timetable and attendance, read marks, answer lecturer feedback, track homework/events/clubs/standing, and optionally ask an AI assistant about their own portal data.

## Product Purpose

Replace the official FSP UI with a mobile-first userscript shell that talks to the same FSP backend. Success means a student can complete day-to-day portal tasks without the desktop-only official layout, page-reload filter dances, or anti-devtools friction.

## Positioning

A full-page portal replacement driven by a `PortalAdapter` contract: one shell, capability-gated nav, live FSP adapter plus a mock adapter for previews. Differentiator on FSP: Final Grade Predictor over remaining assessments, plus optional bring-your-own OpenAI-compatible chat with tools over the active adapter.

## Operating Context

- Runs as a Violentmonkey/Tampermonkey userscript (`match: *://*/*`, idle off-portal).
- Auth is the student’s existing FSP session (token scraped at call time); secrets for chat live in GM storage (`fsp:` prefix).
- Demo/site build mounts the mock shell for developers; it is not a marketing surface.
- Locales: English and Vietnamese.

## Capabilities and Constraints

- Live today: schedule, marks (+ predictor + CSV), feedback, homeworks, clubs, events, standing, notifications, optional AI chat.
- Adapter `features` hide unsupported sections; only FSP is wired.
- Wildcard `@match` retained (ADR 003); host gate + lazy boot keep off-portal idle. `matchesHost` uses DNS-label / suffix matching (not bare substring).
- Configurable LLM base URL: https required; http only for localhost/loopback; confirm before saving a non-default host; `getBaseUrl()` re-validates or resets unsafe stored values; no host allowlist on `@connect`.
- Undocumented internal APIs: portal backend changes can break the live adapter.
- Some official flows (password / dorm) remain on FSP via outbound links.

## Brand Commitments

- Product name: **portals-improved**
- Voice: direct student tooling, FSP-specific claims preferred over universal “every portal” rhetoric
- License: AGPL-3.0-only
- Visual system (see DESIGN.md): Catppuccin flavors + selectable accents; blue reserved for links (`info`)
- Visual chrome: Catppuccin + teal-default accent, inline SVG icons (`Icon.svelte`), Google Sans Flex at weights 400/600/700, lazy-loaded portal views.

## Evidence on Hand

- Live adapter against `https://api.fpt.edu.vn/fsp/api`
- Mock adapter and `pnpm site:dev` preview
- In-app i18n (`src/i18n/en.json`, `vi.json`) and README install path
- No fabricated testimonials, benchmarks, or multi-university adoption claims

## Product Principles

1. Same backend, better shell: never invent grades or mutate without confirmation.
2. Capability-honest UI: hide what the adapter cannot do.
3. Phone-first operate surface; desktop is a wider layout of the same shell.
4. Idle by default off-portal; mock override is intentional and gated.
5. Student-owned secrets and optional AI: no phone-home, no required cloud account for core portal features.

## Accessibility & Inclusion

WCAG-minded operate UI: landmarks, skip link, focus traps on overlays, `role="status"` empty/loading states, toast Escape deferred while modal dialogs (`aria-modal="true"`) are open. Latte flavor uses ink-mixed semantic colors for contrast. Bilingual EN/VI.
