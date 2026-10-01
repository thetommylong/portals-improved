# Portals Improved 🌐

A userscript that throws out your university's student portal and replaces it with something you can actually use on a phone at 2am.

> *Because official portals are so broken it felt like a personal insult.*

> [!WARNING]
> **Vibe-coded software ahead.** Proceed at your own risk!

## The Problem

Every student portal is the same app. Desktop-only, light-mode, tables that scroll sideways, data the backend already sends but the UI hides behind three clicks. It reloads the whole page to change a filter. On a phone it's unusable, and it fights devtools hard enough that you can't inspect what's going wrong.

And you can't fix it. It's not your software.

## The Solution

One shell, one adapter per portal. The shell replaces the portal's entire UI with a mobile-first, dark-mode app that talks to the same backend the official frontend does — but faster, and without the page reloads.

Portals that haven't been wired up yet just don't exist. The shell only renders what the active adapter says it can do.

## Features

- 🧩 **One shell, many portals** — a `PortalAdapter` contract per portal; the UI never talks to a concrete backend
- ♻️ **Capability-aware** — unsupported sections don't render, they don't render broken
- 📱 **Mobile-first** — responsive layout, touch targets that fit a thumb, collapsible nav
- 🌙 **Catppuccin themes** — 4 flavors × 14 accents, follows your system light/dark preference
- 🤖 **AI chat sidebar** — ask questions about your own data; it calls whichever portal SDK tools the active adapter exposes. Bring your own OpenAI-compatible key, or point it at any compatible endpoint
- ♿ **Accessibility** — WCAG-minded: real ARIA roles, focus traps, focus restoration, no unlabelled `<div>` buttons
- 🧪 **Mockable** — every portal has a fake-data adapter, so the whole shell previews on any host without an account
- 🔓 **AGPL-3.0** — free and open source. No telemetry, no paywall, no closed forks

## Portals

| Portal | Host | Status |
|--------|------|--------|
| **FSP University** | `fsp.fpt.edu.vn` | ✅ Live — the original, and the reference implementation |

### FSP University

Where this started. The shell was reverse-engineered against FSP's internal API, so most of its features are things FSP specifically exposes.

- 📅 **Schedule** — timetable with lesson popups and attendance status, cached so it opens offline
- 🏆 **Marks** — full mark breakdown per subject, plus the **Final Grade Predictor**: drag a target average and see what every remaining assessment needs to hit it
- 📤 **CSV export** — dump your grades to a spreadsheet
- 💬 **Feedback** — answer lecturer feedback without the multi-page form dance
- 📚 **Homework, Clubs, Events, Standing** — the rest of the portal, minus the friction
- 🔔 **Notifications** — in-app panel with unread count

<details>
<summary>Adding a portal</summary>

1. Implement `PortalAdapter` from `src/sdk/adapter.ts` — the method set is the whole contract.
2. Declare the hosts you serve in the adapter's own `hosts` field. Nothing else needs to know your portal exists.
3. Set `features` honestly. The shell hides what you mark `false`; it doesn't validate it.
4. Add your class to `LIVE_ADAPTERS` in `src/adapters/runtime.svelte.ts`. That list is the only registry.

Copy `src/adapters/mock.ts` for the fake-data twin so the new portal is previewable immediately.

</details>

## Installation

1. Install a userscript manager — **Violentmonkey** or **Tampermonkey** (desktop or Firefox Android).
2. Click **[Portals Improved.user.js](https://github.com/thetommylong/portals-improved/releases/latest/download/script.user.js)**.
3. Open a supported portal. Enjoy.

The userscript declares `match: *://*/*` so it survives portals moving to new hosts, but it self-gates on hostname and does nothing anywhere else.

## Usage

1. **Log into the portal normally** — the script picks up your existing session
2. **It takes over** — the official UI is replaced once your session resolves
3. **Tap around** — nav on the left on desktop, collapsible on mobile
4. **Ask the chatbot** anything about your schedule, grades, or feedback

### Chat commands

| Command   | What it does |
|-----------|--------------|
| `/help`   | List commands |
| `/key`    | Set your API key |
| `/url`    | Point at a different OpenAI-compatible endpoint |
| `/model`  | Pick a model |
| `/models` | List models available on that endpoint |
| `/clear`  | Clear the conversation |

Your key is stored in userscript storage, never in `.env`, never sent to us.

### Previewing without an account

Append `?adapter=mock` to any URL to mount the whole shell against fake data. Works on any host — the fastest way to work on the UI.

## Configuration

Everything lives in the UI:

- **Theme** — flavor (System / Latte / Frappé / Macchiato / Mocha) and accent, both persisted
- **Chat** — API key, base URL, and model, persisted in userscript storage
- **Adapter** — `?adapter=live` / `?adapter=mock` in the URL, or the stored `portal:adapter` value

## Known Limitations

- **One portal so far.** FSP is live; everything else is a contract waiting for an adapter.
- **It replaces the whole portal.** Anything the official UI did that this doesn't is simply gone.
- **The APIs are undocumented and internal.** When a portal changes its backend, that adapter breaks until someone updates it.
- **The chatbot costs money.** Your key, your endpoint, your bill. It's optional; everything else works without it.
- **No store listing.** Manual userscript install only; no auto-update, so grab new releases by hand.
- **Bugs will happen.** It rewrites `document.body` and drops the portal's stylesheets. That's the whole trick.

---

## Seriously, That's It

It's a userscript that replaces university portal UIs. It doesn't touch your grades, doesn't touch your account, doesn't phone home. If you need a real student information system with support contracts and compliance guarantees, use your university's official portal.

## License

AGPL-3.0. Read [LICENSE](LICENSE).

## Contributing

Issues and PRs are welcome — see [CONTRIBUTING](CONTRIBUTING.md) and the [issue tracker](docs/agents/issue-tracker.md). Adding a portal is the highest-value contribution here.