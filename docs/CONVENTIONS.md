# CONVENTIONS — the Croft chassis, as View adopts it

This file is the Phase 0 deliverable of the build plan: notes taken while reading
`CroftCommunity/croft-pwa` (the standards **and** the reference implementation),
recording exactly which conventions View inherits, and the few places View maps
or extends them. Where this file and the build plan disagree, **croft-pwa's
`CLAUDE.md` governs** (its instruction, followed here).

Source read, in order: `CLAUDE.md`, `AGENTS.md`, the standards chapters
(`chassis.html`, `pwa.html`, `brand.html`, `agent-method.html`, `reference.html`,
`metrics.html`, `user-guide.html`) and their `docs/` (`DESIGN`, `SECURITY`,
`PRACTICES`, `TELEMETRY`), then `plans/` + the `RUN-*-SUMMARY.md` working method.

## The gate (adopted verbatim)

One command, identical to CI: `npm run test` = **lint · typecheck · unit ·
build · e2e**. No phase is "done" red (constraint C3). Sub-parts: `npm run lint`,
`typecheck`, `unit`, `build`, `e2e`.

**Local e2e gotcha (carried over):** Playwright reuses an already-running static
server on :4173 off-CI. If a stale server is serving an older `dist/`, the SRI
hash won't match and module scripts are silently blocked — smoke fails while
csp/mobile-fit pass (the tell-tale shape). Fix: `lsof -ti :4173 | xargs kill -9`
before re-running. CI is immune (never reuses a server).

## Architecture (adopted verbatim)

- **One static HTML shell per destination; no framework, no router.** Navigation
  is real links between real documents (native back button). Each page has an
  entry bundle in `src/pages/`.
- **Zero runtime dependencies.** Everything on the platform (fetch, the DOM,
  `<video>`, service worker, WebCrypto if needed). Dev-only toolchain: esbuild,
  vitest, playwright, tsc, eslint.
- **`build.mjs` is the whole build:** esbuild bundle + content hash, tokens+styles
  concat, CSP+SRI injection, version-stamped service worker + precache.
- **Relative paths, always.** No absolute-root paths; the build throws on one and
  `tests/e2e/subpath.spec.ts` proves the site runs under a subpath. Active tab is
  matched by page **basename**.
- **Pages, not modals.** Inline reveals and transient toasts only.
- **Mobile-first, tap-first.** No horizontal overflow at 320/360/390; touch
  targets ≥40px.
- **Fail loud, degrade soft in the right place.** A missing `#app` throws (a bug);
  a denied cosmetic capability degrades.
- **The console is the debugger of a backendless app** (`src/log.ts`): `[croft]`
  leveled logs, debug/info gated behind `?debug=1` / `localStorage croft-debug`.

### Nav model (chassis, not a hash-router)

Page shells + `src/nav.ts` (the shared shell chrome: topbar, tab bar, footer) +
`src/sw-nav.ts` (the pure SW routing decision). View's tabs: **View (index) ·
About · Metrics · Settings**. The shelves (Live · Parks · Mine) are *within*
`index.html`, not nav tabs.

### Theme model (`src/theme.ts`, verbatim)

Two states only (light/dark), no "auto". An explicit stored choice wins, else the
OS preference. Pre-paint resolution runs as an inline `<head>` script admitted by
its CSP sha256 (byte-identical to `build.mjs` `THEME_INIT_JS`; the unit test pins
the shared logic). `src/theme.ts` owns the toggle after load and syncs
`<meta name="theme-color">` to `--theme-color`. LocalStorage key kept as
`croft-theme` (origin-scoped; no need to rebrand internal keys — View is a Croft
project, and the footer carries the Croft attribution).

### SW caching strategy (`src/sw-nav.ts` + `src/sw.ts`)

Pure decision, unit-tested apart from the worker:

- non-GET → **skip**
- **`media/` paths → skip** (View's one addition — video is never cached or
  intercepted; the SW passes it straight through, per build plan 1.3)
- navigations / HTML → **network-first** (shipped update wins; cached shell is the
  offline fallback; last resort is `offline.html`)
- same-origin content-hashed assets → **cache-first**
- cross-origin → **skip** (never `respondWith`)

`skipWaiting`/`clients.claim` are NOT in install — the Croft default is "ask,
don't ambush": a waiting worker is surfaced (update toast + Settings → Update)
and only takes over on the user's click.

### Test layout (adopted verbatim)

- **Unit (vitest, node):** pure logic only — SW routing, theme resolution,
  brand-token ratios, no-hex guard, plus View's catalog validation, the
  Live-embed law (`embeds.test.ts`), license templates, the mediaBase switch,
  kiosk parsing.
- **Hermetic e2e (playwright):** against the built bundle over the zero-dep static
  server; service workers blocked by default (the `pwa.spec` re-enables them).
  Smoke, CSP (zero violations, no cross-origin script), mobile-fit, a11y (axe,
  both themes), subpath, about, settings, kiosk, pwa.
- **Watch it fail first.** A test not seen RED has not earned trust.

## Telemetry posture (adopted verbatim; add nothing beyond it)

View ships croft-pwa's counter-based, privacy-preserving `src/measure/` module
unchanged in shape (`registry` · `store` · `expiry` · `consent` · `measure`), with
View's own metric set in the registry. The load-bearing properties, unchanged:

- **One registry** is the single source of truth; `MetricName` is derived from its
  keys, so an undeclared metric is a compile error. Each metric declares a
  plain-language `disclosure` and an `expires` honoured at runtime.
- **Rich local store** (ordered events, fine timestamps, device/session id) is
  readable by the user on the Metrics page and **never transmitted**.
- **One flush shape** — `{ v, period, counts }` — is the only thing that can leave;
  `serialiseFlush` reads only the counter bag, `validateWirePayload` rejects any
  extra field, non-integer count, or a period finer than the month bucket.
- **Opt-in, default off.** No remote is configured — a flush only logs the exact
  payload to the console. The Metrics page is the surface.

Nothing beyond this posture is added.

## Brand-token discipline (adopted verbatim)

- **Raw hex lives only in `tokens.css`.** `styles.css` + app code reference
  semantic tokens via `var()`, never a literal colour — enforced by
  `tests/unit/brand-nohex.test.ts`.
- **Every new colour is added to `tokens.css` with a recorded WCAG ratio**, and
  the ratios are re-computed and asserted for both themes by
  `tests/unit/brand-tokens.test.ts`. The numbers are load-bearing.

### Token-name mapping (View's poetic palette → chassis semantic roles)

The chassis brand test asserts the **semantic** token pairs (`ink`/`bg`,
`ink-muted`/`bg`, `ink`/`surface`, `link`/`bg`, `accent-ink`/`accent`,
`active-ink`/`active`, `danger-ink`/`danger`, `focus`/`bg`). View therefore
expresses its two-weather palette *through those roles*; the plan's poetic names
map as:

| View name | Weather | → semantic role |
|---|---|---|
| `--sky` #F6F9FB | morning air (light) | `--bg` |
| `--haze` #E3ECF2 | | `--surface`, `--code-bg` |
| `--water` #9FBAC9 | | `--border` |
| `--pine` #2E4B47 | | `--ink` |
| `--dawn` #C97B3D | | `--accent` (+ derives `--focus`, `--link`) |
| `--storm` #12181F | comforting storm (dark) | `--bg` |
| `--cloud` #1D2733 | | `--surface`, `--code-bg` |
| `--rain` #55677A | | `--border` |
| `--mist` #C9D4DC | | `--ink` |
| `--lamp` #E8B36B | | `--accent`, `--link`, `--focus` |

The two accents (`--dawn` / `--lamp`) are siblings — dawn light / lamp light — so
the brand holds across modes. Actual recorded ratios live beside each token in
`tokens.css`; see `docs/DESIGN.md` for the *why*. View adds two non-text tokens,
`--window-frame` / `--window-sill`, for the window signature (Phase 3.4); they are
decorative (glass edges), so they carry no text-contrast floor.

## Security posture (adopted, with View's media widening)

Build-time `default-src 'none'` CSP + Subresource Integrity on the stylesheet and
every module script; the one inline (pre-paint theme) script admitted by its
sha256, never `unsafe-inline`. `tests/e2e/csp.spec.ts` asserts zero violations and
no cross-origin script. View's one widening: `media-src`/`img-src` (and
`frame-src` only if an embed scene exists) are **derived from `scenes.json` +
`mediaBase`** at build time — so each origin the catalog actually references gets
in and nothing more. Today Parks streams the NPS clips in place, so the build
adds `https://www.nps.gov` to `media-src`; Live cams embed the explore.org player
(served on YouTube), so `https://www.youtube.com` joins `frame-src` (the old
no-YouTube constraint C1 is superseded); our own relative media resolves under
`mediaBase`. See `docs/SECURITY.md`.

## Working method (adopted verbatim)

A dated plan in `plans/` (Problem / Approach / Reasoning, locked decisions,
RED→GREEN order, explicit "not in this run"), and a per-run `RUN-<phase>-SUMMARY.md`
at the repo root carrying red→green evidence, the full gate output, a
verify-in-run ledger for anything a hermetic test can't reach, and a files-touched
ledger. Mirrored here as `RUN-P1..P5`.

## Deploy (app on GitHub Pages; third-party video streamed in place)

The **app** ships to **GitHub Pages** at `view.croft.ing` (custom domain, DNS
verified, HTTPS enforced; a `CNAME` file is emitted into `dist/`; CI builds and
deploys via GitHub Actions — Pages Source must be **GitHub Actions**, not a
branch, so the built output is served, not the raw templates).

View is a **discovery portal, not a mirror**: Live (explore.org) and Parks (NPS)
**stream in place** from the source origin, so that media never touches Pages or
R2. `mediaBase` is the deploy switch for the one shelf that is *our own* content
(Mine) — `""` locally, an R2/CDN origin later. See `docs/DEPLOY.md`.
