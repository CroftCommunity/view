# View

**A window from another point of view.** Ambient scenery views for any screen —
kiosk-friendly for a wall display. Ad-free, static, per-scene licensed. Deployed
to [view.croft.ing](https://view.croft.ing).

View is a [Croft PWA](https://github.com/CroftCommunity/croft-pwa): a static,
backendless, zero-runtime-dependency site built to the Croft chassis standards —
one HTML shell per page, no framework, no router, a version-stamped service
worker, and one gate (`npm run test` = lint · typecheck · unit · build · e2e).

## Quick start

```bash
npm install
npm run test          # the full gate
npm run build && npm run serve   # → http://localhost:4173
```

## How it works

- **`scenes.json`** (repo root) is the only place content lives. Each scene names
  its shelf, kind (`video` · `embed` · `link`), source, and **licence** (shown
  on-page, per scene). `mediaBase` is the single deploy-time switch: `""` locally,
  an R2 origin later — nothing else changes.
- **Three shelves:** **Live** (explore.org cams, as link cards), **Parks** (NPS
  Grand Canyon B-Roll, US public domain), **Mine** (your own clips, CC BY 4.0).
- **The window** is the one deliberate flourish — scenes read as *through* glass.
  Two themes: morning air (light) / comforting storm (dark).
- **Kiosk mode** for a wall display:
  `view.croft.ing/?kiosk=shuffle:parks` (rotate a shelf) or
  `?kiosk=<sceneId>` (one scene), full-viewport, autoplay, loop.

### No ads, ever (constraint C1)

Because YouTube's terms let it monetise embedded content, **no YouTube iframe can
enter the bundle** — enforced by a runtime validator, a unit test that scans
`scenes.json`, and a hard build-time assertion.

## Add your own view (the Mine shelf)

The `media/` and `posters/` folders are gitignored (video never enters git). To
see the Mine shelf locally, drop a clip at:

```
media/mine/test.mp4
```

Then `npm run build && npm run serve` and open the **Mine** shelf. For real
deployment, media is served from R2 via `mediaBase` — see
[`docs/DEPLOY.md`](docs/DEPLOY.md).

## Docs

- [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) — the Croft chassis, as View adopts it
- [`docs/DESIGN.md`](docs/DESIGN.md) — brand: the two weathers + the window signature
- [`docs/SECURITY.md`](docs/SECURITY.md) — CSP/SRI/SW posture
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — GitHub Pages (app) + R2 (media)
- `plans/` + `RUN-P1..P5-SUMMARY.md` — the phased build record

## Licence

Site **code** is AGPL-3.0 ([`LICENSE`](LICENSE)). Scene **content** licences are
separate and per-shelf — see [About](https://view.croft.ing/about.html) or
[`docs/DEPLOY.md`](docs/DEPLOY.md).
