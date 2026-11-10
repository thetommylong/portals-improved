# Portals Improved

A userscript that replaces your university student portal with a mobile-first UI you can use on a phone at 2am.

> [!WARNING]
> **Vibe-coded software.** Use at your own risk.

## The problem

Student portals share the same shape: desktop-only, light mode, sideways-scrolling tables, and data the backend already has buried behind extra clicks. Change a filter and the page reloads. On a phone the UI fails, and the site blocks DevTools enough that you cannot inspect why.

You cannot patch the portal. It is not yours.

## The solution

One shell, one adapter per portal. The shell swaps out the official UI for a mobile-first dark-mode app that calls the same backend as the stock frontend, without full-page reloads.

If a portal has no adapter, the shell stays idle. It only shows what the active adapter claims to support.

## Features

- **One shell, many portals** — each portal implements `PortalAdapter`; the UI never imports a concrete backend
- **Capability-aware** — unsupported sections stay hidden instead of rendering half-broken
- **Mobile-first** — responsive layout, thumb-sized targets, collapsible nav
- **Catppuccin themes** — 4 flavors × 13 accents (blue reserved for links); follows system light/dark
- **AI chat sidebar** — ask about your own data via the tools the active adapter exposes. Bring your own OpenAI-compatible key, or point at another compatible endpoint
- **Accessibility** — ARIA roles, focus traps, focus restoration, no unlabeled `<div>` buttons
- **Mockable** — each portal ships a fake-data adapter so you can preview the shell on any host without an account
- **AGPL-3.0** — free and open source. No telemetry, no paywall, no closed forks

## Portals

| Portal | Host | Status |
|--------|------|--------|
| **FPT University** | `fsp.fpt.edu.vn` | Live — reference implementation |

### FPT University

This is where the project started. The shell was built against FSP's internal API, so most features map to what FSP exposes.

- **Schedule** — timetable with lesson popups and attendance, cached for offline open
- **Marks** — per-subject breakdown, plus a **Final Grade Predictor**: set a target average and see what remaining assessments need
- **CSV export** — grades to a spreadsheet
- **Feedback** — lecturer feedback without the multi-page form
- **Homework, Clubs, Events, Standing** — the rest of the portal with less friction
- **Notifications** — in-app panel with unread count

<details>
<summary>Adding a portal</summary>

1. Implement `PortalAdapter` from `src/sdk/adapter.ts` — that method set is the contract.
2. Put the hosts you serve on the adapter's `hosts` field.
3. Set `features` honestly. The shell hides what you mark `false`; it does not validate the claim.
4. Register the class in `LIVE_ADAPTERS` in `src/adapters/runtime.svelte.ts`. That list is the only registry.

Copy `src/adapters/mock.ts` for a fake-data twin so the portal is previewable from day one.

</details>

## Installation

1. Install a userscript manager — **Violentmonkey** or **Tampermonkey** (desktop or Firefox Android).
2. Click **[Portals Improved.user.js](https://github.com/thetommylong/portals-improved/releases/latest/download/script.user.js)**.
3. Open a supported portal.

The userscript matches `*://*/*` so host moves do not break the install, but it gates on hostname and does nothing elsewhere.

## Usage

1. Log into the portal as usual. The script reuses your session.
2. Once the session resolves, the shell replaces the official UI.
3. Navigate: left rail on desktop, collapsible on mobile.
4. Use the chat for schedule, grades, or feedback questions.

### Chat commands

| Command   | What it does |
|-----------|--------------|
| `/help`   | List commands |
| `/key`    | Set your API key |
| `/url`    | Point at a different OpenAI-compatible endpoint |
| `/model`  | Pick a model |
| `/models` | List models on that endpoint |
| `/clear`  | Clear the conversation |

Your key stays in userscript storage. It never goes in `.env` and is never sent to us.

### Previewing without an account

On a live portal host, append `?adapter=mock`. Off-portal, set userscript storage `portal:adapter` to `mock` (`?adapter=mock` is ignored on unknown hosts so a crafted link cannot open the shell). `pnpm site:dev` always uses the mock.

## Configuration

Everything lives in the UI:

- **Theme** — flavor (System / Latte / Frappé / Macchiato / Mocha) and accent, both persisted
- **Chat** — API key, base URL, and model in userscript storage
- **Adapter** — `?adapter=live` / `?adapter=mock`, or the stored `portal:adapter` value

## Known limitations

- **One portal so far.** FSP is live; other portals need adapters.
- **Full UI replacement.** Official flows this shell does not reimplement are gone. Change-password / dorm still link out to FSP when needed.
- **Undocumented internal APIs.** If a portal changes its backend, that adapter breaks until someone updates it.
- **SSO launch URLs embed the session bearer** in the query string for EduNext handoff (portal contract). The UI opens them locally; the chat agent never gets the raw URL. Be careful with shared screens and untrusted LMS pages.
- **Chat costs money.** Your key, your endpoint, your bill. Optional; the rest of the shell works without it. Prefer HTTPS LLM base URLs you trust.
- **No store listing.** Manual userscript install only; no auto-update. Grab new releases by hand.
- **Bugs.** The script rewrites `document.body` and drops the portal's stylesheets. That is the mechanism.

## License

AGPL-3.0. See [LICENSE](LICENSE).

## Contributing

Issues and PRs welcome — see [CONTRIBUTING](CONTRIBUTING.md) and the [issue tracker](docs/agents/issue-tracker.md). New portal adapters are the highest-value contributions.
