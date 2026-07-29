# Deploy — view.croft.ing

The build output (`dist/`) is a self-contained static site: anything that serves
files serves it. Two facts shape the deploy:

1. **The app is on GitHub Pages** at `view.croft.ing` (custom domain, DNS
   verified, HTTPS enforced — already configured in repo settings).
2. **View streams third-party video in place; it does not mirror it.** View is a
   discovery portal: Live (explore.org) and Parks (NPS) point directly at the
   source origin, so that media never touches Pages, git, or R2. The one
   exception is *our own* content (the Mine shelf), which we self-host via
   `mediaBase` — the only deploy-time switch (`""` locally, an R2/CDN origin
   later). Large third-party media staying off Pages is a consequence of the
   portal model, not a hosting workaround.

## Runs now

```
npm run build && npm run serve   # → http://localhost:4173
```

The site renders fully. Live cams link out to explore.org; **Parks streams the
NPS public-domain clips in place** (tap "Open this view", then use the fullscreen
control to fill the screen from view.croft.ing); Mine windows show a poster +
"Open this view" until you drop a clip under `media/mine/`.

## GitHub Pages (the app)

CI (`.github/workflows/ci.yml`) runs the gate on every push/PR and, on `main`,
builds and deploys `dist/` to Pages via GitHub Actions. The built `dist/` already
contains `CNAME` (`view.croft.ing`) and `.nojekyll`.

> **One settings toggle, once:** Settings → Pages → **Source = "GitHub Actions"**
> (not "Deploy from a branch"). "Deploy from a branch → main / root" would serve
> the raw source templates — which still contain the build-time `%CSP%` / SRI
> placeholders — and render broken. The Actions deploy serves the built output.

## Our own media (the Mine shelf) — R2, later, optional

Only the Mine shelf is content *we* host; Live and Parks stream from their source
and need no infrastructure. When there is real Mine content:

1. **Cloudflare**: `croft.ing` DNS on Cloudflare (prerequisite for R2 custom
   domains). Create an R2 bucket for View's own media; bind a custom domain (e.g.
   `media.view.croft.ing`). Do not use the `r2.dev` URL in production
   (rate-limited, dev-only).
2. **Upload** the Mine originals to `media/mine/` (and any `posters/*.jpg`).
   Optionally re-encode (H.264 high profile 1080p ~6 Mbps, faststart, clean loop
   trim).
3. **Flip the switch**: set `"mediaBase"` in `scenes.json` to the R2 origin and
   rebuild. That is the ONLY change — every *relative* `src` (i.e. our own
   content) resolves under it (proven by `tests/unit/mediabase.test.ts`), and the
   build re-derives the CSP `media-src`/`img-src`. Third-party absolute `src`
   values are untouched.
4. **Wall device**: point the kiosk browser at
   `https://view.croft.ing/?kiosk=shuffle:parks` (or `?kiosk=<sceneId>`).

## Live cams — refreshing the YouTube embed ids

explore.org serves its cams only through YouTube, so each Live scene embeds a
YouTube video id. A live broadcast's id changes when the stream restarts — rare
for perpetual cams (the aurora cam has held one id since 2023), ~yearly for
seasonal ones (Brooks Falls). When a Live cam shows "video unavailable," refresh
the ids:

```
npm run refresh:live         # re-derive current ids from explore.org, rewrite scenes.json
npm run refresh:live:check   # report drift only, non-zero exit if stale (no write)
```

The tool (`tools/refresh-live-ids.mjs`) is fetch-only (no browser): it reads each
scene's `creditUrl` (the explore cam page), extracts the current embed id, and
does a minimal-diff rewrite. It fails loud — if any cam can't be resolved, it
writes nothing and exits non-zero.

In CI this is a **manual-only** workflow (`.github/workflows/refresh-live-ids.yml`,
`workflow_dispatch`) — it never runs on push/deploy (the deploy stays hermetic).
Trigger it from the Actions tab; if any id drifted it opens a PR with the update
to review and merge.

## Parks — streamed from NPS, not mirrored

NPS publishes these Grand Canyon B-Roll clips (public domain, South Rim Winter
set, `b-roll_hd16.htm`) and each plays through a first-party embed player that
serves a direct `.mp4`. View points each Parks scene straight at that `.mp4`
(`kind:"video"`, absolute `src`) and streams it in place — the build adds
`www.nps.gov` to `media-src` automatically. There is nothing to mirror. If a clip
URL ever changes, re-derive it by opening the NPS embed player
(`nps.gov/media/video/embed.htm?id=<id>` — the ids are recorded in
`RUN-P4-SUMMARY.md`) and reading its `<video>` source, then update the scene's
`src`.

## Optional wink

Redirect `window.croft.ing` → `view.croft.ing` (the pun lives in the copy; the
redirect is the wink).
