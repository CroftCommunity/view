# RUN P5 — legal furniture + PWA polish

Scope: the About page (licensing legend, contact, AGPL note), the always-present
footer licence line, the offline page, and PWA/a11y verification. Then the full
gate + push.

## What shipped

- **`about.html` + `src/pages/about.ts`** — what View is; the three-shelf
  **licensing legend** (Mine: CC BY 4.0 · Parks: US public domain (NPS et al.) ·
  Live: © explore.org, per their guidelines); a **contact** link
  (`chase@owasp.org`) so a creator/rights-holder can reach the owner directly
  before any platform process; and the **code licence** note — AGPL-3.0 with a
  repo link. Scene content licences are stated as separate and per-shelf (C4).
- **Footer on every view** (`src/nav.ts`): a compact licence line
  ("Mine CC BY 4.0 · Parks public domain · Live © explore.org") + an About link,
  alongside the build stamp and Croft attribution.
- **`offline.html` + `src/pages/offline.ts`** — the SW's last-resort navigation
  fallback, in voice ("No view without a sky — you're offline.").
- **PWA:** installable (manifest, standalone, maskable window icon); SW serves the
  shell (and precached `scenes.json`) offline; **media requests bypass the SW**;
  keyboard focus visible everywhere; both themes verified by axe.

## Evidence — the gate is green

```
lint       ESLint: clean (no issues)
typecheck  tsc --noEmit — 0 errors
unit       Test Files 11 passed (11) · Tests 70 passed (70)
build      built v0 0.1.0+<sha> -> dist/  (5 pages, sw + precache 15, CSP+SRI on, C1 ok, budget ok)
           sizes(gz): index 6.5K · about 4.4K · settings 4.2K · metrics 4.3K · offline 3.4K · styles.css 5.0K
e2e        45 passed  (smoke · csp · mobile-fit · a11y[both themes] · subpath · about · settings · kiosk · pwa)
```

e2e coverage added in P5: `about.spec.ts` (legend + contact + AGPL + footer
licence line on every page), `settings.spec.ts` (update control, kiosk launchers,
Croft attribution), `pwa.spec.ts` (SW registers + controls; shell survives
offline; **media/ is never placed in the cache**).

## Verify-in-run ledger (what a hermetic test cannot reach)

- **Lighthouse PWA + a11y ≥ 95** and a real device install are not run in this
  headless environment. axe (both themes, every page) is green and the manifest/
  SW/offline path are e2e-verified; a manual Lighthouse pass on the deployed
  origin is owed to the owner.
- **Live per-cam first-party audit** is unresolved in this environment — all Live
  cams ship as C1-safe link cards (RUN-P4).
- **Real media** (Parks/Mine `.mp4`, posters) is not present — windows show a
  poster + "Open this view" until R2/local media exists (owner — P6, `docs/DEPLOY.md`).
- **CI Pages deploy** requires the owner to set Pages Source = "GitHub Actions"
  (documented in `docs/DEPLOY.md`) — otherwise the raw templates would be served.

## Files touched

New: `about.html`, `offline.html`, `src/pages/{about,offline}.ts`,
`tests/e2e/{about,settings,pwa}.spec.ts`, `docs/{CONVENTIONS,DESIGN,SECURITY,
DEPLOY}.md`. Changed: `src/nav.ts` (footer licence line), `README.md`.
