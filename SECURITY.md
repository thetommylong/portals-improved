# Security Policy

## Supported versions

Security fixes are applied to the latest `main` branch of [portals-improved](https://github.com/thetommylong/portals-improved). There are no long-term support releases.

## Reporting a vulnerability

**Do not open a public GitHub issue for security reports.**

Use [GitHub private vulnerability reporting](https://github.com/thetommylong/portals-improved/security/advisories/new) so the report stays private until a fix is ready.

Include:

- A short description of the issue and impact
- Steps to reproduce (or a proof of concept)
- Affected commit / release tag if known

You should get an acknowledgement within a few days. Please give a reasonable window before any public disclosure.

If you cannot use GitHub advisories, email **hi@thetommylong.is-a.dev** with the same details.

## Scope notes

This project is a userscript / demo site that talks to third-party portal APIs. Reports about the upstream FSP portal itself belong with FPT; reports about dependency CVEs in build-only tooling are welcome but may be deferred until an upstream patch exists.

## Install integrity

GitHub Releases still mark the newest tag as “latest” (`make_latest: true`) so the convenience `/releases/latest/download/script.user.js` URL works for casual installs. For a digest-bound consumer identity, pin the userscript to a **specific release tag** URL (`/releases/download/vX.Y.Z/script.user.js`) instead of `latest`.

## Needs validation (unfixed)

These were noted in a deep security audit and are **not** claimed fixed here — they need server-side or userscript-manager observation, not demo/mock probes:

- `fsp-live.studentId.unbound-object-id` — whether the FSP API enforces object-level authz on student/term IDs is unobserved (no live portal API probing).
- `sdk.openai.gmRequest-redirect-host-policy-unobserved` — whether `GM_xmlhttpRequest` replays `Authorization` across cross-host redirects is manager-specific; the demo `fetch` shim does not prove manager behavior.
