// Kiosk mode — the wall display's URL, and the easter-egg behaviour.
//
//   index.html?kiosk=<sceneId>          → boot straight into that scene, full
//                                          viewport, autoplay, loop.
//   index.html?kiosk=shuffle:<shelf>    → rotate the shelf on a timer (default
//                                          10 min) with a slow crossfade.
//   &every=<seconds>                    → override the shuffle interval (the wall
//                                          uses the default; tests use a short one).
//   &idle=<seconds>                     → override the overlay idle-fade delay.
//
// The parsing and the rotation step are pure (unit-tested); the overlay wiring is
// a thin DOM helper.
import type { Shelf } from './catalog';

export type KioskMode = 'scene' | 'shuffle';

export interface KioskConfig {
  readonly mode: KioskMode;
  readonly sceneId?: string;
  readonly shelf?: Shelf;
  /** Shuffle interval in ms (default 10 minutes). */
  readonly everyMs: number;
  /** Overlay idle-fade delay in ms (default 4 seconds). */
  readonly idleMs: number;
}

const SHELVES = new Set<Shelf>(['live', 'parks', 'mine']);
const DEFAULT_EVERY_MS = 10 * 60 * 1000;
const DEFAULT_IDLE_MS = 4 * 1000;

function seconds(params: URLSearchParams, key: string, fallbackMs: number, minMs: number): number {
  const raw = params.get(key);
  if (raw === null) return fallbackMs;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallbackMs;
  return Math.max(minMs, Math.round(n * 1000));
}

/** Parse a kiosk config from a location search string, or null if not kiosk. */
export function parseKiosk(search: string): KioskConfig | null {
  const params = new URLSearchParams(search);
  const kiosk = params.get('kiosk');
  if (!kiosk) return null;

  const everyMs = seconds(params, 'every', DEFAULT_EVERY_MS, 1000);
  const idleMs = seconds(params, 'idle', DEFAULT_IDLE_MS, 500);

  if (kiosk.startsWith('shuffle:')) {
    const shelf = kiosk.slice('shuffle:'.length) as Shelf;
    if (!SHELVES.has(shelf)) return null;
    return { mode: 'shuffle', shelf, everyMs, idleMs };
  }
  return { mode: 'scene', sceneId: kiosk, everyMs, idleMs };
}

/** The next index when rotating a shelf of `length` scenes (wraps). Pure. */
export function nextIndex(current: number, length: number): number {
  if (length <= 0) return 0;
  return (current + 1) % length;
}

export interface OverlayHandle {
  /** Reveal the overlay and restart the idle timer. */
  poke(): void;
  /** Stop timers (test teardown). */
  stop(): void;
}

/**
 * Wire an overlay so any pointer/touch reveals it and it fades after `idleMs` of
 * quiet. Returns a handle; the caller decides where the overlay lives.
 */
export function mountKioskOverlay(overlay: HTMLElement, idleMs: number): OverlayHandle {
  let timer = 0;
  const hide = (): void => overlay.classList.add('is-hidden');
  const poke = (): void => {
    overlay.classList.remove('is-hidden');
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(hide, idleMs);
  };
  const events: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown', 'touchstart'];
  for (const ev of events) window.addEventListener(ev, poke, { passive: true });
  poke();
  return {
    poke,
    stop: () => {
      if (timer) window.clearTimeout(timer);
      for (const ev of events) window.removeEventListener(ev, poke);
    },
  };
}
