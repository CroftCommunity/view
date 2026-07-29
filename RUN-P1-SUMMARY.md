# RUN P1 — transplant the chassis

Scope: copy the `CroftCommunity/croft-pwa` chassis into View per its "starting a
new Croft PWA" instructions, stand up View's page shells, and get the gate green
on empty shells. Plan: `plans/2026-07-29-1-plan-view.md`. Conventions absorbed in
`docs/CONVENTIONS.md` (Phase 0).

## What shipped

- **Chassis, verbatim:** `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`,
  `playwright.config.ts`, `tools/serve.mjs`, and `src/{theme,log,version,
  sw-register,update-toast}.ts` + the whole `src/measure/` telemetry module.
- **Chassis, adapted:** `build.mjs` (View's page list, scenes.json copy + C1 build
  gate + CSP origins derived from scenes.json, offline fallback name), `nav.ts`
  (tabs View · About · Metrics · Settings, wordmark "View", footer licence line +
  About + Croft attribution), `sw.ts` + `sw-nav.ts` (media pass-through + offline
  fallback), `package.json` (renamed `view`; dropped guide/atproto/@live scripts).
- **Page shells:** `index.html`, `about.html`, `settings.html`, `metrics.html`,
  `offline.html` — chassis-style templates with the CSP/SRI/theme tokens.
- **PWA identity:** `manifest.webmanifest` (name "View", standalone, both
  orientations, theme_color per mode) + a window-frame glyph `icons/icon.svg`
  (lit window at night). SW precache adds `scenes.json`; **`media/` is never
  cached** (explicit rule, unit-tested).
- **`.gitignore`** extended: `media/` and `posters/` originals never enter git.
  **CI** (`.github/workflows/ci.yml`): the gate on push/PR + a GitHub Pages deploy
  (Actions). **`CNAME`** = `view.croft.ing`.

## Evidence — gate green

`lint` clean · `typecheck` clean · `unit` 70 · `build` 5 pages, precache 15,
CSP+SRI on, C1 ok · `e2e` 45. (Full output in RUN-P5; the chassis smoke/csp/
mobile/subpath specs were the P1 red→green drivers, then extended through P2–P4.)

## Verify-in-run ledger

- Internal `croft-*` localStorage keys and the `[croft]` log tag kept verbatim
  (origin-scoped; View is a Croft project). Only user-facing branding changed.

## Files touched

New: all of the above + the shells. Changed vs croft-pwa: `build.mjs`,
`package.json`, `nav.ts`, `sw.ts`, `sw-nav.ts`, `manifest.webmanifest`, `icon.svg`,
`.gitignore`, CI. (Content system, brand, shelves, kiosk, legal furniture land in
P2–P5.)
