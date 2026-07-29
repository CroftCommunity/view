# Security posture — View

View is a static, backendless site served from a header-less host (GitHub Pages).
Security is built into the artifact at build time and verified by the gate, not
configured on a server. This adopts croft-pwa's posture, with one media widening.

## Content Security Policy (build-time, in a `<meta>`)

`build.mjs` injects a `default-src 'none'` policy into every page, then opens only
what the app needs. The default (local, relative media) is:

```
default-src 'none'; base-uri 'none'; form-action 'none';
img-src 'self' data:; media-src 'self' data: blob:;
font-src 'self'; style-src 'self'; manifest-src 'self';
connect-src 'self'; worker-src 'self';
script-src 'self' 'sha256-<pre-paint theme init>'
```

- **No `unsafe-inline`.** The one inline script (the pre-paint theme resolver) is
  admitted by its sha256, computed at build over the exact bytes injected.
- **`media-src` / `img-src` / `frame-src` are derived from `scenes.json`.** The
  build reads every scene's `src`/`poster` and the `mediaBase`, and adds exactly
  the external origins referenced — nothing more. Today Parks **streams the NPS
  clips in place** (absolute `src`), so the build adds `https://www.nps.gov` to
  `media-src`; Live cams **embed the explore.org player** (served on YouTube), so
  the build adds `https://www.youtube.com` to `frame-src`; our own (Mine) media is
  relative (`'self'`, later joined by the `mediaBase` origin). Only origins the
  catalog actually references are admitted.
- **Embeds are allowed (constraint C1 superseded).** C1 once made the build
  **throw** on a YouTube embed to guarantee no ads. Under the portal model that is
  reversed — Live cams are YouTube embeds, and the build simply adds their origin
  to `frame-src`. `tests/unit/embeds.test.ts` asserts the new law; the CSP keeps
  the blast radius to exactly the embed origins the catalog names. View itself
  runs no ads or tracking, but an embedded source player may carry the source's
  ads (revisit if it becomes a problem).
- **`frame-ancestors` is intentionally absent** from the meta CSP — browsers ignore
  it there (it must be an HTTP header). The static host applies it; noted so a
  reviewer does not read the omission as a gap.

## Subresource Integrity

The stylesheet and every module script carry a `sha384` `integrity` (with
`crossorigin="anonymous"`), computed at build over the emitted bytes. Combined
with content-hashed filenames, a stale or swapped bundle is structurally rejected.

## Service worker

- The worker **never** `respondWith`s a cross-origin request, so third-party
  traffic (YouTube embeds, NPS streams, later our own R2 media) behaves
  identically with and without the worker, and route fixtures are not shadowed.
  This is also why the streamed Parks clips (`www.nps.gov`) and Live embeds
  (`www.youtube.com`) are never cached — a cross-origin request is skipped
  outright.
- **`media/` is never cached or intercepted** — our own video is huge and R2
  egress is metered, so the SW passes same-origin media straight through
  (`src/sw-nav.ts`; proven by `tests/e2e/pwa.spec.ts` — "media/ is never placed
  in the cache").
- Version-stamped, "ask, don't ambush" updates (waiting worker surfaced, never
  swapped mid-session). Navigation offline-fallback is the cached shell, then
  `offline.html`.

## Third-party content boundaries

- **Live** cams embed the source's own player in place. explore.org serves its
  cams only through YouTube, so a Live scene is a sandboxed YouTube `<iframe>`;
  the build adds only `https://www.youtube.com` to `frame-src`. This supersedes
  the original C1 ("no YouTube, ever") — an embedded source player may carry the
  source's ads; View itself runs no ads and no tracking. See
  `tests/unit/embeds.test.ts`.
- **Embeds are tap-to-play.** A page never loads a YouTube iframe until the viewer
  taps "Open this view", so a plain visit makes no third-party player request.
- **The iframe is sandboxed** (`allow-scripts allow-same-origin allow-presentation
  allow-popups`, never `allow-top-navigation`) and `default-src 'none'` keeps the
  blast radius to exactly the `frame-src` origins the catalog names.
- **Parks** streams the NPS `.mp4` directly (`media-src https://www.nps.gov`); no
  iframe, no chrome.

## Verified by the gate

`tests/e2e/csp.spec.ts` loads every document, asserts zero
`securitypolicyviolation` events and no cross-origin `<script src>`. A change that
introduces an inline handler, an `unsafe-inline`, or a third-party script fails
the gate.
