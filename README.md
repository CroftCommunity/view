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
  on-page, per scene). View is a **discovery portal, not a mirror**: third-party
  scenes (Live · Parks) **stream in place** from the source origin (an absolute
  `src`). Our own clips (Mine) use a relative `src` that `mediaBase` — the single
  deploy-time switch, `""` locally and an R2/CDN origin later — resolves.
- **Three shelves:** **Live** (explore.org cams, embedded in place through the
  source's own player — served on YouTube), **Parks** (NPS Grand Canyon B-Roll,
  US public domain — the direct public-domain `.mp4` streamed in place), **Mine**
  (your own clips, CC BY 4.0). Video/embed scenes play inline (tap to start) with
  a fullscreen control, so you never leave view.croft.ing.
- **The window** is the one deliberate flourish — scenes read as *through* glass.
  Two themes: morning air (light) / comforting storm (dark).
- **Kiosk mode** for a wall display:
  `view.croft.ing/?kiosk=shuffle:parks` (rotate a shelf) or
  `?kiosk=<sceneId>` (one scene), full-viewport, autoplay, loop.

### Ads and embeds (constraint C1, superseded)

View adds no ads, no accounts, and no tracking of its own. The original
constraint C1 went further — **no YouTube iframe, ever** — to guarantee no ads at
all. That is now **superseded**: View is a discovery portal, and explore.org
serves its cams only through YouTube, so the Live shelf embeds the source's
YouTube player in place. An embedded source player may carry that source's ads;
the tradeoff was chosen deliberately (embed over a bare external link) and will
be revisited if it becomes a problem. The CSP still admits only the exact embed
origins the catalog references.

## Add your own view (the Mine shelf)

The `media/` and `posters/` folders are gitignored (video never enters git). To
see the Mine shelf locally, drop a clip at:

```
media/mine/test.mp4
```

Then `npm run build && npm run serve` and open the **Mine** shelf. Mine is the
one shelf that is *our own* content, so it is the only media View self-hosts: for
real deployment it is served via `mediaBase` (an R2/CDN origin). Live and Parks
never enter git or R2 — they stream from their source. See
[`docs/DEPLOY.md`](docs/DEPLOY.md).

## Docs

- [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) — the Croft chassis, as View adopts it
- [`docs/DESIGN.md`](docs/DESIGN.md) — brand: the two weathers + the window signature
- [`docs/SECURITY.md`](docs/SECURITY.md) — CSP/SRI/SW posture
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — GitHub Pages (app); third-party streamed in place; our own media via `mediaBase`
- `plans/` + `RUN-P1..P5-SUMMARY.md` — the phased build record

## Licence

Site **code** is AGPL-3.0 ([`LICENSE`](LICENSE)). Scene **content** licences are
separate and per-shelf — see [About](https://view.croft.ing/about.html) or
[`docs/DEPLOY.md`](docs/DEPLOY.md).
