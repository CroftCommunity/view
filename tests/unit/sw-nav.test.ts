import { describe, it, expect } from 'vitest';
import { swStrategy, isMediaPath, type SwRequestInfo } from '../../src/sw-nav';

const req = (over: Partial<SwRequestInfo>): SwRequestInfo => ({
  method: 'GET',
  mode: 'no-cors',
  accept: '',
  sameOrigin: true,
  path: '/assets/index-abc.js',
  ...over,
});

describe('swStrategy', () => {
  it('never intercepts non-GET requests', () => {
    expect(swStrategy(req({ method: 'POST' }))).toBe('skip');
  });

  it('serves navigations network-first (shipped updates win, cache is fallback)', () => {
    expect(swStrategy(req({ mode: 'navigate', path: '/index.html' }))).toBe('network-first');
  });

  it('serves HTML accept network-first even when mode is not navigate', () => {
    expect(swStrategy(req({ accept: 'text/html,application/xhtml+xml', path: '/about.html' }))).toBe(
      'network-first',
    );
  });

  it('serves same-origin assets cache-first (hashed names cannot go stale)', () => {
    expect(swStrategy(req({ sameOrigin: true, accept: '*/*' }))).toBe('cache-first');
  });

  it('never intercepts cross-origin requests', () => {
    expect(swStrategy(req({ sameOrigin: false, accept: '*/*', path: '/x.js' }))).toBe('skip');
  });

  it('NEVER caches or intercepts media/ (video passes straight through)', () => {
    expect(swStrategy(req({ path: '/media/parks/clip.mp4', accept: '*/*' }))).toBe('skip');
    // Even a media path served under a subpath prefix is skipped.
    expect(swStrategy(req({ path: '/pr-preview/pr-1/media/mine/test.mp4' }))).toBe('skip');
    // And a media navigation is still skipped (media is never the shell).
    expect(swStrategy(req({ mode: 'navigate', path: '/media/x.mp4' }))).toBe('skip');
  });
});

describe('isMediaPath', () => {
  it('matches a media/ segment anywhere in the path', () => {
    expect(isMediaPath('/media/x.mp4')).toBe(true);
    expect(isMediaPath('/sub/media/x.mp4')).toBe(true);
  });
  it('does not match non-media paths', () => {
    expect(isMediaPath('/assets/media-player.js')).toBe(false);
    expect(isMediaPath('/index.html')).toBe(false);
  });
});
