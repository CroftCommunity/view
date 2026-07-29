# RUN P4 — shelves (Live · Parks · Mine) + kiosk

Scope: populate the three shelves under their per-shelf licensing rules, and build
kiosk mode with its e2e.

## 4.1 Live — explore.org

**Per-cam player audit (mandatory record).** The audit requires opening each cam
page and inspecting whether the player is a first-party HTML5/HLS player or a
YouTube-wrapped iframe. **That inspection could not be performed in this hermetic
build environment** (explore.org renders its player client-side; no reliable
first-party-vs-YouTube determination was possible without executing their page).
Constraint C1 admits no third option, so **every Live cam ships as a `link` poster
card** ("Watch live at explore.org →", opening the specific cam page in a new
tab) — the C1-safe fallback the plan specifies when first-party cannot be
confirmed. No explore.org content is embedded or recorded; footage remains
© explore.org, shown per their deep-link/embed guidance.

Cams (scenic, landscape-leaning; real cam-page URLs, verified to exist):

| Scene | Cam page |
|---|---|
| African watering hole · Mpala, Kenya | `/livecams/african-wildlife/african-watering-hole-animal-camera` |
| African river · Mpala, Kenya | `/livecams/african-wildlife/african-river-wildlife-camera` |
| Aurora borealis · Churchill, Canada | `/livecams/aurora-borealis-northern-lights/northern-lights-cam` |
| Brooks Falls · Katmai, Alaska | `/livecams/brown-bears/brown-bear-salmon-cam-brooks-falls` |

Credit template (`license:"explore-fan"`): "Live from explore.org — <cam>" + a
direct link to the cam page.

**To activate first-party embeds later** (owner, non-hermetic): open each cam,
confirm a first-party HTML5/HLS player, and only then change that scene to
`kind:"embed"`. The build/validator/test will reject any YouTube host, and
`build.mjs` will derive the needed `frame-src` origin automatically.

## 4.2 Parks — NPS (public domain)

Source: Grand Canyon B-Roll HD archive (public domain; no release required; must
not imply NPS endorsement; **no NPS arrowhead anywhere in the app** — honoured:
the app embeds no NPS chrome).

**Adaptation from the plan:** NPS no longer exposes direct `.mp4` URLs — every
clip is delivered through a first-party NPS embed player
(`nps.gov/media/video/embed.htm?id=…`). Embedding that player would risk NPS
branding/arrowhead inside our app, against the curation rule. So Parks ships as
`kind:"video"` with **relative `media/parks/*.mp4`** paths (the R2-mirror target),
keeping the mediaBase design uniform and the app chrome NPS-free. The credit links
point at the real NPS clip page.

Curated clips (window-suited: long, static-ish; sunrise/sunset/snow; people/zoom
skipped) — all from the South Rim Winter set, `b-roll_hd16.htm`, with their NPS
media embed IDs for the owner's mirror step:

| Scene id | NPS embed id |
|---|---|
| `grca-bright-angel-winter-sunset` | `2420D96E-155D-451F-67F5DF1C124619EA` |
| `grca-yaki-point-winter-sunrise` | `256D9C8B-155D-451F-6797C5DB9C67C393` |
| `grca-oneill-butte-sunrise` | `2840FE9D-155D-451F-671C0D671D8285D9` |
| `grca-north-rim-still` | `2A568871-155D-451F-67E3218AE691CAB3` |
| `grca-north-rim-sunrise-pan` | `2AC3C166-155D-451F-67E2EBF337B8351C` |

Credit template (`license:"public-domain"`): "National Park Service — public
domain" + archive link. **TODO(R2):** mirror/re-encode into `media/parks/` (public
domain permits redistribution); tracked in `docs/DEPLOY.md`.

## 4.3 Mine — personal (one test scene)

Exactly one: `mine-test`, `kind:"video"`, `src:"media/mine/test.mp4"`,
`license:"cc-by"`, credit "© croft — CC BY 4.0". The path is gitignored; the owner
drops a clip there locally (documented in the README). R2 swap later = set
`mediaBase`, nothing else — asserted by `tests/unit/mediabase.test.ts`.

## 4.4 Kiosk mode

- `index.html?kiosk=<sceneId>` → boots into that scene, full-viewport stage,
  chrome hidden, autoplay + loop; a minimal overlay (title + shelf switcher) fades
  after 4s idle and returns on pointer/touch/key.
- `index.html?kiosk=shuffle:<shelf>` → rotates the shelf on a 10-min timer
  (`&every=<s>` overrides; the wall uses the default) with a slow crossfade;
  reduced-motion → cut.
- Parsing + the rotation step are pure (`tests/unit/kiosk.test.ts`).

## Evidence — red → green

`kiosk.test.ts` (parse scene/shuffle, interval overrides, wrap-around advance) and
`tests/e2e/kiosk.spec.ts` (boot-to-scene full-viewport + chrome hidden; overlay
fades after idle and returns on interaction; **shuffle advances the shelf, cutting
under reduced motion** — one media layer, not two) drove it. Gate green:
unit 70 · e2e 45.

## Files touched

New: `src/kiosk.ts`, `tests/unit/kiosk.test.ts`, `tests/e2e/kiosk.spec.ts`, and
`scenes.json` content. Changed: `src/pages/index.ts` (shelves + kiosk render),
`styles.css` (shelf nav, rail, kiosk).
