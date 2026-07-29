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
  the external origins referenced — nothing more. Today all Parks/Mine video is
  relative (`'self'`) and Live cams are `link` cards (opened in a new tab, not
  embedded), so no external origin is added and no `frame-src` is emitted. When
  `mediaBase` points at an R2 origin, that origin (and only it) joins `media-src`
  and `img-src`.
- **Constraint C1 is enforced at build time.** If a scene is an `embed` whose host
  is a YouTube property, the build **throws** — matching the runtime validator and
  the `no-youtube` unit test. No YouTube iframe can enter the bundle.
- **`frame-ancestors` is intentionally absent** from the meta CSP — browsers ignore
  it there (it must be an HTTP header). The static host applies it; noted so a
  reviewer does not read the omission as a gap.

## Subresource Integrity

The stylesheet and every module script carry a `sha384` `integrity` (with
`crossorigin="anonymous"`), computed at build over the emitted bytes. Combined
with content-hashed filenames, a stale or swapped bundle is structurally rejected.

## Service worker

- The worker **never** `respondWith`s a cross-origin request, so third-party
  traffic (explore.org links, later R2 media) behaves identically with and without
  the worker, and route fixtures are not shadowed.
- **`media/` is never cached or intercepted** — video is huge and R2 egress is
  free, so the SW passes media straight through (`src/sw-nav.ts`; proven by
  `tests/e2e/pwa.spec.ts` — "media/ is never placed in the cache").
- Version-stamped, "ask, don't ambush" updates (waiting worker surfaced, never
  swapped mid-session). Navigation offline-fallback is the cached shell, then
  `offline.html`.

## Third-party content boundaries

- **Live** cams are `link` cards that open explore.org in a new tab
  (`rel="noopener noreferrer"`) — no embedding, no cross-origin script, no CSP
  widening. This is the C1-safe posture: no ad-bearing iframe can render in the
  app.
- The `embed` kind is implemented and unit-tested (sandboxed iframe, YouTube host
  rejected), but **no embed scene ships** in this build (see RUN-P4), so the CSP
  stays tight.

## Verified by the gate

`tests/e2e/csp.spec.ts` loads every document, asserts zero
`securitypolicyviolation` events and no cross-origin `<script src>`. A change that
introduces an inline handler, an `unsafe-inline`, or a third-party script fails
the gate.
