# Deploy — view.croft.ing

The build output (`dist/`) is a self-contained static site: anything that serves
files serves it. Two facts shape the deploy:

1. **The app is on GitHub Pages** at `view.croft.ing` (custom domain, DNS
   verified, HTTPS enforced — already configured in repo settings).
2. **Video is NOT on Pages.** Large media comes via `mediaBase` (an R2 origin),
   because Pages is not for serving video and the chassis keeps `mediaBase` as the
   only deploy-time switch.

## Runs now (no R2, no media)

```
npm run build && npm run serve   # → http://localhost:4173
```

The site renders fully; Parks/Mine windows show a poster + "Open this view" until
their media exists, and Live cams link out to explore.org.

## GitHub Pages (the app)

CI (`.github/workflows/ci.yml`) runs the gate on every push/PR and, on `main`,
builds and deploys `dist/` to Pages via GitHub Actions. The built `dist/` already
contains `CNAME` (`view.croft.ing`) and `.nojekyll`.

> **One settings toggle, once:** Settings → Pages → **Source = "GitHub Actions"**
> (not "Deploy from a branch"). "Deploy from a branch → main / root" would serve
> the raw source templates — which still contain the build-time `%CSP%` / SRI
> placeholders — and render broken. The Actions deploy serves the built output.

## R2 (the media) — owner, ~30 min, one-time

1. **Cloudflare**: `croft.ing` DNS on Cloudflare (prerequisite for R2 custom
   domains). Create an R2 bucket for View's media; bind a custom domain (e.g.
   `media.view.croft.ing`). Do not use the `r2.dev` URL in production (rate-limited,
   dev-only). Serving video from R2 through Cloudflare is the explicitly permitted
   configuration; do not front third-party storage with the CDN for video.
2. **Upload** the media originals: `media/parks/*.mp4`, `media/mine/test.mp4`, and
   any `posters/*.jpg`. Optionally re-encode (H.264 high profile 1080p ~6 Mbps,
   faststart, clean loop trim) so playback never depends on a third party.
3. **Flip the switch**: set `"mediaBase"` in `scenes.json` to the R2 origin (e.g.
   `https://media.view.croft.ing`) and rebuild. That is the ONLY change — every
   relative `src` resolves under it (proven by `tests/unit/mediabase.test.ts`), and
   the build re-derives the CSP `media-src`/`img-src` to include that origin.
4. **Wall device**: point the kiosk browser at
   `https://view.croft.ing/?kiosk=shuffle:parks` (or `?kiosk=<sceneId>`).

## Parks media — what to mirror

NPS no longer exposes direct `.mp4` URLs (only first-party embed players), so the
Parks `src` values are the intended mirrored paths under `media/parks/`. The five
Grand Canyon B-Roll clips chosen (all public domain, South Rim Winter set,
`b-roll_hd16.htm`) and their NPS media embed IDs are recorded in
`RUN-P4-SUMMARY.md` so the owner can mirror the exact assets.

## Optional wink

Redirect `window.croft.ing` → `view.croft.ing` (the pun lives in the copy; the
redirect is the wink).
