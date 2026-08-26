# Design & brand — View

View is "a window from another point of view." The brand is two weathers seen
through one window: **morning air** (light) and a **comforting storm** (dark).
Everything is quiet except one deliberate signature — the window itself.

`tokens.css` is the source of truth (the only file with raw hex); this doc is the
*why*. The token-name → semantic-role mapping is in `docs/CONVENTIONS.md`.

## The rule that matters (Croft discipline)

**Raw hex lives only in `tokens.css`.** Components and app code use semantic
tokens through `var()`. A new colour is added to `tokens.css` with a recorded
contrast ratio — never invented inline. Both rules are enforced by tests
(`brand-nohex`, `brand-tokens`), so a regression fails the gate.

## Palette + recorded WCAG ratios

### Light — "morning air" (default): pale, airy, early daylight

| Token | Hex | Role | Contrast (actual) |
|---|---|---|---|
| `--bg` (`--sky`) | `#F6F9FB` | page background | — |
| `--surface` (`--haze`) | `#E3ECF2` | cards, raised surfaces | — |
| `--ink` (`--pine`) | `#2E4B47` | body text | 8.97:1 on bg · 7.93:1 on surface |
| `--ink-muted` | `#4E6B72` | captions, mono facts | 5.41:1 on bg · 4.78:1 on surface |
| `--accent` (`--dawn`) | `#C97B3D` | primary action fill | 5.15:1 w/ `--accent-ink` |
| `--active` | `#2E5D53` | active/current fill | 7.08:1 w/ `--active-ink` |
| `--link` | `#8F511F` | body-text links | 5.90:1 on bg · 5.22:1 on surface |
| `--danger` | `#A23520` | warning/destructive | 6.48:1 w/ `--danger-ink` |
| `--border` (`--water`) | `#9FBAC9` | hairline dividers | (decorative, exempt) |
| `--focus` | `#B4632C` | focus ring | 4.17:1 on bg (≥3 floor) |

### Dark — "storm, but comforting": dark, weatherly, warm-inside-while-it-rains

| Token | Hex | Role | Contrast (actual) |
|---|---|---|---|
| `--bg` (`--storm`) | `#12181F` | deep blue-slate, not black | — |
| `--surface` (`--cloud`) | `#1D2733` | surfaces | — |
| `--ink` (`--mist`) | `#C9D4DC` | body text | 11.85:1 on bg · 10.02:1 on surface |
| `--ink-muted` | `#8B9CAB` | captions, mono facts | 6.33:1 on bg · 5.35:1 on surface |
| `--accent` (`--lamp`) | `#E8B36B` | primary action fill | 9.43:1 w/ `--accent-ink` |
| `--active` | `#6FB08C` | active/current fill | 7.03:1 w/ `--active-ink` |
| `--link` (`--lamp`) | `#E8B36B` | body-text links | 9.43:1 on bg · 7.98:1 on surface |
| `--danger` | `#E4795B` | warning/destructive | 6.11:1 w/ `--danger-ink` |
| `--border` (`--rain`) | `#55677A` | hairline dividers | (decorative, exempt) |
| `--focus` (`--lamp`) | `#E8B36B` | focus ring | 9.43:1 on bg |

The two accents (`--dawn` / `--lamp`) are **siblings** — dawn light / lamp light —
so the brand holds across modes; the dark accent is the "comfort" the storm copy
promises. `brand-tokens.test.ts` recomputes every pair for both themes.

## The window signature (the one flourish)

The stage is a **window**: a thin inset frame, a soft inner shadow (the glass),
and a slightly heavier **sill** line at the bottom edge, so a scene reads as
*through* glass rather than pasted on the page. A few px, no skeuomorphism. In
dark mode the frame + sill warm toward `--lamp` (`--window-frame` /
`--window-sill` re-tune per theme — the lamplight below the glass). Everything
else is quiet. In the Phase 3.7 critique one decoration was removed: the horizon
line that had been repeated on every rail thumbnail — it now lives only on the big
stage, so the signature stays singular.

## Type

- **Display**: Fraunces (wordmark, headings — used sparingly, never body).
- **Body/UI**: Inter. **Machine facts** (build stamp, wire payload, status):
  `ui-monospace`. Deliberately avoids the stock AI looks (cream+terracotta serif;
  near-black+acid accent). Faces are self-hostable with system fallbacks; no
  cross-origin font is loaded (CSP `font-src 'self'`).

## Copy voice (plain, warm, short)

Wordmark **View**; hero line "Put a window where there isn't one." Buttons say
what they do ("Open this view", "Fullscreen"). Empty shelf:
"Nothing here yet — the first view is coming." Offline: "No view without a sky
— you're offline."

## Navigation law (Croft, verbatim)

Pages, not modals. Mobile-first single column below 40rem; tabs move to a
thumb-reachable bottom bar on phones. Touch targets ≥44px (WCAG 2.5.5 — the
workspace floor, `CroftC/.claude/MOBILE-FIRST.md`). Empty states are
invitations with a next step, never a blank box. Focus is visible everywhere (a
3px `--focus` outline); `prefers-reduced-motion` collapses transitions (and the
scene crossfade becomes a cut).
