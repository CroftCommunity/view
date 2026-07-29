# RUN P3 — brand: palette + the window signature

Scope: retune `tokens.css` to View's two weathers with recorded WCAG ratios, add
the window signature, set typography, do the copy pass, and self-critique.

## What shipped

- **`tokens.css`** — two themes through the chassis semantic roles:
  - **Light "morning air"**: `--sky/haze/water/pine/dawn` → bg/surface/border/ink/
    accent. ink/bg **8.97:1**, ink-muted/bg 5.41:1, link/bg 5.90:1 (on surface
    5.22:1), accent-ink/accent 5.15:1, active-ink/active 7.08:1, focus/bg 4.17:1.
  - **Dark "comforting storm"**: `--storm/cloud/rain/mist/lamp`. ink/bg **11.85:1**,
    ink-muted/bg 6.33:1, link/bg 9.43:1, accent-ink/accent 9.43:1, active-ink/active
    7.03:1, focus/bg 9.43:1.
  - The two accents (`--dawn` / `--lamp`) are siblings; the dark accent is the
    "comfort." All ratios recorded beside the tokens and re-asserted for both
    themes by `brand-tokens.test.ts` (16 assertions).
- **Window signature** — the stage is a window: thin inset frame, soft inner
  shadow (glass), heavier sill at the bottom, and a horizon line; in dark the
  frame + sill warm toward `--lamp` (`--window-frame` / `--window-sill`).
- **Typography** — Fraunces (display/wordmark) + Inter (body/UI) + `ui-monospace`
  (machine facts); no cross-origin font (CSP `font-src 'self'`). Avoids the stock
  AI serif+terracotta / near-black+acid looks.
- **Copy pass** — wordmark "View", hero "Put a window where there isn't one.",
  action-named buttons, empty shelf and offline lines in voice.

## Evidence — red → green

`brand-nohex.test.ts` (styles.css holds zero hex) and `brand-tokens.test.ts`
(every text/UI pair clears its WCAG floor, both themes) drove the token values;
one light `--link` was darkened (#9C5A22 → #8F511F) when the on-surface ratio came
in at exactly 4.50 — pushed to 5.22 for margin. axe (both themes, every page)
green. Gate: unit 70 · e2e 45.

## Self-critique (Phase 3.7)

Screenshots taken both themes at phone (390) + desktop (1200) widths. The two
weathers read as intended (airy morning / warm storm), sibling amber accents hold
across modes. **One decoration removed:** the horizon line had been repeated on
every rail thumbnail — cut, so it lives only on the big stage and the signature
stays singular. Also centred the link/play button inside the window (was
top-left).

Verify-in-run: screenshots captured headless in this environment; a human eyeball
pass in real Chrome is still owed before treating visuals as final.

## Files touched

Changed: `tokens.css`, `styles.css`, `manifest.webmanifest` (theme colours),
`icons/icon.svg`. Docs: `docs/DESIGN.md`.
