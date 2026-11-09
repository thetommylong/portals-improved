# Portals Improved

A userscript that replaces FSP’s student portal UI (`fsp.fpt.edu.vn`) with a phone-usable shell on the same backend.

> [!WARNING]
> **Vibe-coded software ahead.** Proceed at your own risk!

## Install

1. Install **Violentmonkey** or **Tampermonkey** (desktop or Firefox Android).
2. Click **[Portals Improved.user.js](https://github.com/thetommylong/portals-improved/releases/latest/download/script.user.js)**.
3. Open FSP and log in. After the session resolves, the userscript replaces the official UI.

The userscript declares `match: *://*/*` so it survives host moves, but it self-gates on hostname and does nothing anywhere else.

## What you get (FSP)

- Mobile-first schedule, marks, feedback, homework, clubs, events, standing, and notifications
- Final Grade Predictor: set a target average and see what remaining assessments need
- CSV export for grades
- Optional AI chat over your own portal data (bring an OpenAI-compatible key / endpoint)
- Catppuccin themes (4 flavors × 13 accents; blue reserved for links)
- Mock adapter for previews without an account

One shell, one `PortalAdapter` per portal. Unsupported sections stay hidden. Only FSP is live today; other portals need an adapter.

## Chat commands

| Command   | What it does |
|-----------|--------------|
| `/help`   | List commands |
| `/key`    | Set your API key |
| `/url`    | Point at a different OpenAI-compatible endpoint (https; http only for localhost) |
| `/model`  | Pick a model |
| `/models` | List models available on that endpoint |
| `/clear`  | Clear the conversation |

Keys live in userscript storage, never in `.env`, never sent to us.

## Preview without an account

On a live portal host, append `?adapter=mock`. Off-portal, set userscript storage `portal:adapter` to `mock` (URL `?adapter=mock` is ignored on unknown hosts).

The demo site (`pnpm site:dev` / `pnpm site:build:static`) is a **developer preview** of the mock shell, not a marketing site. Production demo deploys to [GitHub Pages](https://thetommylong.github.io/portals-improved/) on `main`; open PRs get a Cloudflare Pages preview URL commented on the PR.

## Configuration

- **Theme:** flavor (System / Latte / Frappé / Macchiato / Mocha) and accent, both persisted
- **Chat:** API key, base URL, and model in userscript storage
- **Adapter:** `?adapter=live` / `?adapter=mock`, or stored `portal:adapter`

<details>
<summary>Adding a portal</summary>

1. Implement `PortalAdapter` from `src/sdk/adapter.ts`.
2. Declare hosts on the adapter’s `hosts` field.
3. Set `features` for what the portal supports; the shell hides the rest.
4. Add the class to `LIVE_ADAPTERS` in `src/adapters/runtime.svelte.ts`.
5. Add the same host fragment to `LIVE_HOST_FRAGMENTS` in `src/adapters/hosts.ts` (idle gate).

Copy `src/adapters/mock.ts` for a fake-data twin.

</details>

## Known limitations

- Only FSP is live; other portals wait on adapters.
- Flows the official UI still owns (password change, dorm, etc.) link back to FSP.
- APIs are undocumented; backend changes can break an adapter until someone updates it.
- SSO launch URLs embed a session bearer for EduNext handoff. The UI opens them locally; the chat agent never receives the raw URL.
- Chat is optional and billed to your key. Custom base URLs should be HTTPS endpoints you trust (localhost http is allowed for local servers).
- Manual userscript install only; grab new releases by hand.
- The script rewrites `document.body` and drops the portal’s stylesheets.

## License

AGPL-3.0. Read [LICENSE](LICENSE).

## Contributing

Issues and PRs welcome. See [CONTRIBUTING](CONTRIBUTING.md) and the [issue tracker](docs/agents/issue-tracker.md). Adding a portal is the highest-value contribution.
