# RUN P2 — the catalog (content system)

Scope: `scenes.json` as the only place content lives, a loader + validator, the
stage renderer (video/embed/link), the per-scene credit chip (C2), shelf
navigation, and the C1 no-YouTube scan.

## What shipped

- **`scenes.json`** at the repo root (served static). Schema per scene: `id`,
  `shelf` (live|parks|mine), `title`, `kind` (video|embed|link), `src`, optional
  `poster`, `license` (public-domain|cc-by|explore-fan), `credit`, `creditUrl`,
  optional `loop`. `mediaBase` is the single deploy-time switch.
- **`src/catalog.ts`** — pure types + `validateCatalog` (returns the valid subset
  + human problems, so the loader can fail-loud in dev / skip-and-log in prod),
  `resolveMediaUrl` (the mediaBase join), shelf/id helpers, and the **C1**
  primitives (`hostOf`, `isYouTubeHost`, `youTubeEmbeds`). `loadCatalog` fetches +
  validates (relative URL, subpath-safe).
- **`src/stage.ts`** — the window. `video`: native `<video muted autoplay loop
  playsinline>`, tap-to-play for browsing (no eager remote load) / autoplay for
  kiosk, crossfade between scenes (cut under reduced-motion). `embed`: sandboxed
  `<iframe>` (implemented, not activated). `link`: poster card + external-arrow
  button (new tab). `renderCredit` renders the credit chip for every scene.
- **`src/license.ts`** — `creditFor` selects the on-page wording from the scene's
  `license` (PD verbatim · CC BY verbatim · explore-fan "Live from explore.org —").
- **Shelf nav** (Live · Parks · Mine) + a thumbnail rail, in `src/pages/index.ts`.

## Evidence — red → green (TDD)

Unit specs written to fail first, then made green:
`catalog.test.ts` (valid/invalid/duplicate/skip-subset), **`no-youtube.test.ts`**
(the shipped `scenes.json` has zero YouTube embeds; the guard DOES flag a crafted
`youtube.com/embed` and `youtu.be` — the law has teeth), `license.test.ts`
(template selection), `mediabase.test.ts` (absolute untouched; relative resolves
under a remote base; shipped scenes obey the law). The e2e smoke asserts the
credit chip renders per scene (C2) and shelves switch.

Gate green: unit 70 · build "C1 ok" (the build throws on a YouTube embed).

## Scoped out (with reason)

Real media bytes (owner/R2 — P6). Activating `embed` scenes (needs a non-hermetic
first-party audit; link cards ship — P4).

## Files touched

New: `scenes.json`, `src/{catalog,license,stage}.ts`, `tests/unit/{catalog,
no-youtube,license,mediabase}.test.ts`. Changed: `build.mjs` (C1 build gate +
scenes.json copy), `src/pages/index.ts`.
