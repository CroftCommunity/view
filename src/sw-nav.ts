// Pure service-worker routing decision, extracted so it is unit-testable with no
// SW runtime (the SW itself, sw.ts, is a thin shell around this). The recipe:
//
//   - non-GET            → skip (never intercept)
//   - media/ paths       → skip (NEVER cache video — it is huge and R2 egress is
//                          free; the SW must pass media requests straight through)
//   - navigations / HTML → network-first (a shipped update is picked up next
//                          open; the cached shell is the offline fallback)
//   - same-origin assets → cache-first (content-hashed names make staleness
//                          structurally impossible)
//   - cross-origin       → skip (NEVER call respondWith, so Playwright route
//                          fixtures and later media/CDN traffic behave identically
//                          with and without the worker)

export type SwStrategy = 'network-first' | 'cache-first' | 'skip';

export interface SwRequestInfo {
  readonly method: string;
  readonly mode: string;
  readonly accept: string;
  readonly sameOrigin: boolean;
  /** URL pathname, used to keep `media/` out of the cache. */
  readonly path: string;
}

/** True for a request whose path is under a `media/` segment (video, never cached). */
export function isMediaPath(path: string): boolean {
  return /(^|\/)media\//.test(path);
}

export function swStrategy(req: SwRequestInfo): SwStrategy {
  if (req.method !== 'GET') return 'skip';
  // Media is never cached and never intercepted — pass it straight to the network
  // (build plan 1.3: "the SW must pass media requests through").
  if (isMediaPath(req.path)) return 'skip';
  if (req.mode === 'navigate' || req.accept.includes('text/html')) return 'network-first';
  if (req.sameOrigin) return 'cache-first';
  return 'skip';
}
