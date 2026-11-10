# MDN-backed Web platform edge-case inventory

Catalog of Web platform edges **portals-improved** can hit given how it is built: userscript `match: ['*://*/*']`, `run-at: document-start`, GM grants + `connect: *` (ADR 003), idle gate → dynamic boot, full-page `document.body.replaceChildren`, stylesheet strip, sticky/fixed UI, pointer media, Temporal polyfill, light-DOM Svelte mount, demo-site CSP, `unsafeWindow` anti-devtools, focus traps, etc.

**Method:** Surfaces mapped from source (`src/`, `vite.config.ts`, `site/`, ADRs), then documented via **MDN MCP** (`mdn` namespace: `search` / `get-doc` / `get-compat`). Paths below are MDN `/en-US/docs/...` paths (prefix `https://developer.mozilla.org`).

**Severity / likelihood:** H/M/L relative to this codebase’s real paths (live FSP userscript vs demo `gm-shim`). Not an encyclopedia — only APIs/behaviors the code uses or can encounter.

**Out of scope for MDN:** Tampermonkey/Violentmonkey grant semantics themselves (only the web-platform edges those grants touch).

---

## 1. Bootstrap / DOM / CSSOM

| surface | edge case | why this project can hit it | MDN path | sev | like |
| --- | --- | --- | --- | --- | --- |
| `document.body` @ `document-start` | `body` is `null` until parser creates it | Userscript `run-at: document-start`; boot waits for `body` or `DOMContentLoaded` before `replaceChildren` (`50-portal.ts`) | `/en-US/docs/Web/API/Document/body` | H | H |
| `Element.replaceChildren` | Empties body: discards portal DOM, listeners, pending in-tree scripts | Full-page replace into `#fsp-qol-root` (ADR 001) | `/en-US/docs/Web/API/Element/replaceChildren` | H | H |
| `Element.replaceChildren` | `HierarchyRequestError` on tree-constraint violations | Unusual document types / framesets change what `body` is | `/en-US/docs/Web/API/Element/replaceChildren` | L | L |
| `window.stop()` | Stops further resource loads; **cannot** interrupt already-running document scripts | Called after replace to cut portal asset loads | `/en-US/docs/Web/API/Window/stop` | M | H |
| `window.stop()` | Race with remaining parser / late classic scripts | `document-start` + stop vs portal markup still parsing | `/en-US/docs/Web/API/Window/stop` | M | M |
| Stylesheet strip / CSSOM | Removing `link[rel=stylesheet]` / `<style>` drops those sheets from `document.styleSheets` | Boot strips head sheets, re-injects Vite `/*$vite$:` + `sharedCss` | `/en-US/docs/Web/API/Document/styleSheets` | H | H |
| `StyleSheet.ownerNode` | `@import` sheets report `ownerNode === null` | Strip only walks DOM owners — imported sheets easy to miss | `/en-US/docs/Web/API/StyleSheet/ownerNode` | M | M |
| `color-scheme` | Inherited; UA chrome follows used scheme | After replace, `html`/meta scheme can disagree with reinjected CSS | `/en-US/docs/Web/CSS/Reference/Properties/color-scheme` | M | M |
| `FontFaceSet.load` | Promise **rejects** if any face fails | `document.fonts.load` for Google Sans Flex 400/600/700 | `/en-US/docs/Web/API/FontFaceSet/load` | H | M |
| `font-display` / FOIT–FOUT | Block vs swap controls invisible/visible fallback | Fonts CSS uses `display=swap`; text can still flash | `/en-US/docs/Web/CSS/Reference/At-rules/@font-face/font-display` | M | H |
| `position: sticky` | Sticks to nearest overflow scrolling ancestor (even if not the intended scroller) | `ScheduleView` sticky day/time gutters | `/en-US/docs/Web/CSS/Reference/Properties/position` | H | H |
| `position: sticky` | Needs non-`auto` inset or behaves as `relative` | Missing `top` → headers never pin | `/en-US/docs/Web/CSS/Reference/Properties/position` | M | M |
| `position: fixed` | Containing block becomes ancestor with `transform`/`filter`/`perspective`/`will-change: transform` | Fixed overlays (LessonPopup, drawers, shell) after light-DOM mount | `/en-US/docs/Web/CSS/Reference/Properties/position` | H | M |
| `position: fixed` + Visual Viewport | Fixed tracks **layout** viewport; mobile OSK/pinch shrinks visual viewport | Fixed chrome drifts under keyboard / zoom | `/en-US/docs/Web/API/VisualViewport` | H | H |
| Sticky/fixed + scroll | Repaint jank / motion sensitivity | Long schedule scrolls + overlays | `/en-US/docs/Web/CSS/Reference/Properties/position` | M | M |
| `prefers-color-scheme` | OS/UA theme; pair with `color-scheme` to avoid chrome flash | Theme store + bootstrap strip/reinject | `/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme` | M | H |
| `prefers-reduced-motion` | Should reduce vestibular motion | Toasts / transitions (`notifications.ts`) | `/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion` | M | M |
| `(pointer: coarse)` | Primary pointer accuracy only | Seeds pointer mode for hit targets | `/en-US/docs/Web/CSS/Reference/At-rules/@media/pointer` | M | H |
| `MediaQueryList` `change` | Prefer `addEventListener('change')` (legacy `addListener` deprecated) | Theme / pointer MQL listeners | `/en-US/docs/Web/API/MediaQueryList/change_event` | M | H |
| `DOMContentLoaded` already fired | Listener never runs if registered after DCL | Dynamic `import("./boot")` can land after `interactive`/`complete` | `/en-US/docs/Web/API/Document/DOMContentLoaded_event` | H | H |
| `document.readyState` | `loading` → `interactive` → `complete` | Body-ready vs DCL vs `window.stop` / font loads race | `/en-US/docs/Web/API/Document/readyState` | M | H |
| CSP `style-src` | Blocks non-allowlisted `<style>` / stylesheet links / style attrs; JS `.style.foo=` not blocked | Demo CSP allows `'unsafe-inline'` for reinjected styles | `/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src` | H | M |
| CSP `font-src` | Restricts `@font-face` URLs | Demo allows `fonts.gstatic.com`; mismatch → `fonts.load` rejects | `/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/font-src` | H | M |
| Light DOM (no Shadow) | App CSS in document cascade; leftover host rules can leak | Svelte `mount` into `#fsp-qol-root` after strip | `/en-US/docs/Web/API/Document/styleSheets` | M | M |

**BCD spot-checks:** `api.Element.replaceChildren` ~Chrome/Edge 86 / Firefox 78 / Safari 14 (no IE). `api.Window.stop` long-standing (no IE). Fine for modern userscript targets.

---

## 2. Userscript grants / security / networking / storage

| surface | edge case | why this project can hit it | MDN path | sev | like |
| --- | --- | --- | --- | --- | --- |
| `Location.href` / `assign` | Navigate; `javascript:` XSS-adjacent; `SecurityError` cases | `00-devtools.ts` filters `disable-devtool` via href/assign patches | `/en-US/docs/Web/API/Location/href`, `/en-US/docs/Web/API/Location/assign`, `/en-US/docs/Web/URI/Reference/Schemes/javascript` | H | M |
| `history.pushState` / `replaceState` | Same-origin URL or throw; no immediate load; cloneable state | Same disable-devtool URL filter | `/en-US/docs/Web/API/History/pushState`, `/en-US/docs/Web/API/History/replaceState` | M | M |
| Capture + `stopPropagation` | Does **not** cancel default actions (`preventDefault` needed) | Capture F12/contextmenu only `stopPropagation` — browser defaults may still fire | `/en-US/docs/Web/API/Event/stopPropagation` | M | H |
| `stopImmediatePropagation` | Stops same-target listeners too | Portal listener earlier in capture can starve the patch | `/en-US/docs/Web/API/Event/stopImmediatePropagation` | M | M |
| `setInterval` monkeypatch | String form is eval sink; CSP/`unsafe-eval` | Anti-devtools wraps `unsafeWindow.setInterval` | `/en-US/docs/Web/API/Window/setInterval` | H | M |
| `Function.prototype.toString` | Natives/cross-realm throw or `[native code]`; obfuscation hides markers | `looksLikeAntiDevtools` residual miss (documented in script) | `/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/toString` | M | H |
| `Window.close` | Only script-opened windows reliably closable | Patched to noop | `/en-US/docs/Web/API/Window/close` | L | M |
| Web Storage quota / private mode | ~5 MiB; `QuotaExceededError`; private clears on last tab; sync blocking | Demo GM shim → `localStorage`; FSP tokens in page storage | `/en-US/docs/Web/API/Web_Storage_API`, `/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria` | H | M |
| `sessionStorage` lifetime | Per-tab; cleared when session ends | Auth fallback `sessionStorage.token` | `/en-US/docs/Web/API/Window/sessionStorage` | M | M |
| Partitioned third-party storage | Third-party iframes get partitioned buckets | Top-level portal less affected; embeds would isolate keys | `/en-US/docs/Web/API/Storage_Access_API` | M | L |
| GM vs Web Storage | Production GM storage ≠ origin Web Storage; demo maps GM→`localStorage` | Secrets `fsp:*` via GM; demo inherits page quota/clear-site-data | `/en-US/docs/Web/API/Window/localStorage` | H | H |
| `document.cookie` parsing | Whitespace; values with `=`; substring name matches; `HttpOnly` invisible | `getToken()` `/token=([^;]+)/` + `decodeURIComponent` | `/en-US/docs/Web/API/Document/cookie` | H | H |
| `fetch` + CORS | Page `fetch`/`XHR` CORS-bound; `Authorization` → preflight | Demo shim uses `fetch`; production `GM_xmlhttpRequest` bypasses page CORS | `/en-US/docs/Web/HTTP/Guides/CORS`, `/en-US/docs/Web/API/Window/fetch` | H | H |
| `AbortController` | Abort rejects fetch; reason/timeout collapsed in shim | Demo GM XHR stand-in | `/en-US/docs/Web/API/AbortController` | L | H |
| `URL` / schemes | Parses `javascript:`/`data:`; app must reject | `validateOutboundUrl` allowlists https + loopback http | `/en-US/docs/Web/API/URL` | H | M |
| `URL.hostname` IPv6 brackets | May keep `[::1]` | Loopback check strips brackets | `/en-US/docs/Web/API/URL` | M | L |
| `URLSearchParams` | Case-sensitive names | `?adapter=mock` gate (live hosts only) | `/en-US/docs/Web/API/URLSearchParams` | M | M |
| CSP `connect-src` / `script-src` | Page CSP binds document fetch/eval; userscript world ≠ page | Demo meta CSP; live GM ignores page `connect-src` | `/en-US/docs/Web/HTTP/Guides/CSP`, `/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src` | H | H |
| Referrer-Policy | `strict-origin-when-cross-origin` default/demo | Demo `<meta name="referrer" …>` | `/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy` | L | H |
| Auth multi-source scrape | Any same-origin XSS can steal readable tokens | `access_token` / meta Authorization / storage `token` / cookie | `/en-US/docs/Web/API/Window/localStorage`, `/en-US/docs/Web/API/Document/cookie` | H | M |
| Match-all + host gate | Script loads everywhere; must idle off-portal | `hasLiveAdapter` / GM mock / query mock (ADR 003) | `/en-US/docs/Web/API/Location`, `/en-US/docs/Web/API/URLSearchParams` | H | H |

**Privilege split:** Demo is CORS/CSP/Web-Storage bound; production networking/secrets are GM-grant bound. `validateOutboundUrl` is the app-layer counterweight to `connect: *`.

---

## 3. Events / focus / pointer / Temporal / download / sanitize

| surface | edge case | why this project can hit it | MDN path | sev | like |
| --- | --- | --- | --- | --- | --- |
| `HTMLElement.focus` | May scroll into view; focus rings optional without `focusVisible` | `overlayFocus.ts` focuses first control / container | `/en-US/docs/Web/API/HTMLElement/focus` | M | H |
| `document.activeElement` restore | Detached nodes after `replaceChildren`; restore no-ops | Overlay open after full-page replace | `/en-US/docs/Web/API/Document/activeElement` | M | H |
| Tab trap / `tabindex` | CSS focusable selector misses some widgets; positive tabindex order quirks | `FOCUSABLE` in `overlayFocus.ts` | `/en-US/docs/Web/HTML/Reference/Global_attributes/tabindex` | M | M |
| Escape / Tab keys | Need `preventDefault` to stop Tab move | Overlay trap + Escape close | `/en-US/docs/Web/API/KeyboardEvent/key` | M | H |
| `pointer` vs `pointerType` | Primary media vs last event type diverge on hybrids | `pointer.svelte.ts` seeds MQL then overrides on `pointerdown` | `/en-US/docs/Web/CSS/Reference/At-rules/@media/pointer`, `/en-US/docs/Web/API/PointerEvent/pointerType` | M | H |
| `any-pointer` | Secondary coarse pointers | Fine-primary + touch finger may undersize targets | `/en-US/docs/Web/CSS/Reference/At-rules/@media/any-pointer` | M | M |
| `requestAnimationFrame` | Paused in background tabs; one-shot; use timestamp | Toast double-rAF + progress loop | `/en-US/docs/Web/API/Window/requestAnimationFrame` | L | H |
| `createObjectURL` / revoke | Leak if not revoked; SW unavailable | CSV export creates/revokes blob URL | `/en-US/docs/Web/API/URL/createObjectURL_static` | L | H |
| `<a download>` | Only same-origin / `blob:` / `data:` | CSV uses `blob:` (OK); cross-origin would navigate | `/en-US/docs/Web/HTML/Reference/Elements/a` | M | L |
| `innerHTML` / `{@html}` | XSS injection sink; event-handler attrs execute | Chat: marked → DOMPurify → `{@html}` | `/en-US/docs/Web/API/Element/innerHTML` | H | H |
| Sanitizer / mutation XSS class | Parser/sanitizer gaps historically bypassable | DOMPurify forbid list; keep deps + UA quirks in view | `/en-US/docs/Web/Security/Attacks/XSS` | H | L |
| `Temporal.PlainDate` | **Not Baseline** — Chrome/Edge 144+, Firefox 139+, Safari preview | `@js-temporal/polyfill` in `dateHelper.ts` is required for current Safari / older Chromium | `/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate` | H | H without polyfill / L with |
| SVG focusability | Modern focus via HTML/`tabindex`; legacy `focusable` | Icons set `focusable="false"` | `/en-US/docs/Web/API/SVGElement/focus` | L | M |
| `scrollWidth` / `clientWidth` | Integer CSS px; subpixel flaky near threshold | LessonCard overflow `+ 1` fudge | `/en-US/docs/Web/API/Element/scrollWidth` | L | M |
| `scrollTop` | Subpixel; fights sticky during programmatic scroll | ScheduleView `scrollTop` + sticky gutters | `/en-US/docs/Web/API/Element/scrollTop` | M | M |

---

## Highest-priority watch list

1. **Bootstrap races:** `document.body` null, DCL-already-fired after dynamic import, `window.stop` vs remaining portal loads (`50-portal.ts`).
2. **Layout:** sticky + overflow ancestors; fixed + visual viewport / transformed containing blocks (schedule + overlays).
3. **Privilege split:** demo `fetch`/CSP vs production `GM_xmlhttpRequest` + `connect: *`; outbound URL validation must stay in front of grants.
4. **Auth scrape:** page-readable storage/meta/cookie tokens (XSS = session).
5. **Devtools residual:** `stopPropagation` ≠ defaults; `Function#toString` misses obfuscation; unpatched APIs (`location.replace`, workers).
6. **Chat HTML:** `innerHTML`/Trusted Types class of risk — keep DOMPurify config tight.
7. **Temporal:** polyfill mandatory until Safari ships Baseline Temporal.

---

## Source anchors (non-exhaustive)

| Area | Primary files |
| --- | --- |
| Match / grants / connect | `vite.config.ts`, `docs/adr/003-match-all-lazy-gate.md` |
| Gate / idle boot | `src/index.ts`, `src/adapters/gate.ts`, `src/boot.ts` |
| Full-page replace | `src/scripts/50-portal.ts`, `src/site/main.ts`, ADR 001 |
| Anti-devtools | `src/scripts/00-devtools.ts` |
| Auth / GM network | `src/adapters/fsp-live.ts`, `src/sdk/openai.ts`, `src/sdk/outbound-url.ts` |
| Demo shim / CSP | `src/site/gm-shim.ts`, `site/index.html` |
| Pointer / theme / toasts | `src/pointer.svelte.ts`, `src/theme.svelte.ts`, `src/notifications.ts` |
| Focus / chat / CSV / dates | `src/ui/portal/overlayFocus.ts`, `ChatMessage.svelte`, `csvExport.ts`, `dateHelper.ts` |
| Sticky schedule | `src/ui/portal/ScheduleView.svelte` |

---

## Maintenance

- Prefer MDN MCP over memory when extending this list.
- Working slices used during research may appear as `_mdn-slice-*.md`; this file is the canonical inventory for the repo.
