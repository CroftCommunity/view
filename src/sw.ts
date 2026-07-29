// Service worker source — bundled by build.mjs to a stable-named dist/sw.js with
// the precache manifest injected via `define`. The routing decision lives in the
// pure, unit-tested swStrategy(). Navigations are network-first with the cached
// shell (and, as a last resort, the offline page) as the offline fallback.
// Requests under media/ are never intercepted or cached (video is huge; R2
// egress is free) — swStrategy returns 'skip' for them.
//
// This file is typed against the DOM lib (not WebWorker) to keep one tsconfig;
// the SW globals we use are declared locally and cast from `self`.
import { swStrategy } from './sw-nav';

declare const __PRECACHE__: readonly string[];
declare const __CACHE__: string;
declare const __OFFLINE__: string;

interface ExtEvent {
  waitUntil(p: Promise<unknown>): void;
}
interface FetchEventLike {
  readonly request: Request;
  respondWith(r: Promise<Response>): void;
}
interface MessageEventLike {
  readonly data: unknown;
}
interface SWGlobal {
  addEventListener(type: 'install' | 'activate', cb: (e: ExtEvent) => void): void;
  addEventListener(type: 'fetch', cb: (e: FetchEventLike) => void): void;
  addEventListener(type: 'message', cb: (e: MessageEventLike) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  location: { origin: string };
}

const sw = self as unknown as SWGlobal;

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(__CACHE__);
      // Per-asset tolerance: one missing precache entry must not brick install.
      await Promise.all(
        __PRECACHE__.map((url) =>
          cache.add(url).catch(() => {
            /* tolerate a single miss */
          }),
        ),
      );
      // "Ask, don't ambush": no skipWaiting() here — an updated worker WAITS until
      // the page asks it to take over (the update toast / Settings → Update posts
      // SKIP_WAITING). A first install has no active worker to wait behind.
    })(),
  );
});

// The page asks the waiting worker to take over (user-initiated update).
sw.addEventListener('message', (event) => {
  const data = event.data;
  if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'SKIP_WAITING') {
    void sw.skipWaiting();
  }
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== __CACHE__).map((k) => caches.delete(k)));
      await sw.clients.claim();
    })(),
  );
});

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) {
    const cache = await caches.open(__CACHE__);
    await cache.put(request, res.clone());
  }
  return res;
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(__CACHE__);
      await cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Last resort for a navigation with no cached match: the offline page, kept
    // in the voice ("No view without a sky — you're offline.").
    const offline = await caches.match(__OFFLINE__);
    if (offline) return offline;
    throw err;
  }
}

sw.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const strategy = swStrategy({
    method: request.method,
    mode: request.mode,
    accept: request.headers.get('accept') ?? '',
    sameOrigin: url.origin === sw.location.origin,
    path: url.pathname,
  });
  if (strategy === 'network-first') event.respondWith(networkFirst(request));
  else if (strategy === 'cache-first') event.respondWith(cacheFirst(request));
});
