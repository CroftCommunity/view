import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveMediaUrl, validateCatalog, isAbsoluteUrl, type Catalog } from '../../src/catalog';

// The mediaBase law: mediaBase is the deploy-time switch for our OWN content, and
// every RELATIVE scene src resolves under it. Absolute src — third-party streams
// and embeds (NPS, YouTube) — is used as-is. R2 swap later = set mediaBase.
describe('resolveMediaUrl — the deploy-time switch', () => {
  it('leaves an absolute src untouched regardless of mediaBase', () => {
    expect(resolveMediaUrl('', 'https://explore.org/x')).toBe('https://explore.org/x');
    expect(resolveMediaUrl('https://cdn.example', 'https://explore.org/x')).toBe('https://explore.org/x');
  });

  it('keeps a relative src relative when mediaBase is empty (local)', () => {
    expect(resolveMediaUrl('', 'media/parks/a.mp4')).toBe('media/parks/a.mp4');
  });

  it('joins a relative src under a remote mediaBase (R2), tolerating slashes', () => {
    expect(resolveMediaUrl('https://cdn.example', 'media/mine/test.mp4')).toBe('https://cdn.example/media/mine/test.mp4');
    expect(resolveMediaUrl('https://cdn.example/', '/media/mine/test.mp4')).toBe('https://cdn.example/media/mine/test.mp4');
  });
});

describe('shipped scenes.json obeys the mediaBase law', () => {
  const raw: unknown = JSON.parse(readFileSync(new URL('../../scenes.json', import.meta.url), 'utf8'));
  const { catalog, problems } = validateCatalog(raw);
  const c = catalog as Catalog;

  it('is wholly valid', () => {
    expect(problems).toEqual([]);
  });

  it('every relative video src resolves under a remote mediaBase (the R2 swap)', () => {
    const base = 'https://media.view.croft.ing';
    for (const s of c.scenes) {
      if (s.kind === 'video' && !isAbsoluteUrl(s.src)) {
        expect(resolveMediaUrl(base, s.src)).toBe(`${base}/${s.src}`);
      }
    }
  });

  // View is a discovery portal that STREAMS third-party video in place — it is
  // not a mirror. Live (explore.org) and Parks (NPS) point at the source origin
  // directly; only our own future content (Mine) is a relative, self-hostable
  // path that mediaBase later resolves.
  it('our own (Mine) video src stays relative — the self-host target', () => {
    for (const s of c.scenes) {
      if (s.shelf === 'mine' && s.kind === 'video') {
        expect(isAbsoluteUrl(s.src), `${s.id} should be relative`).toBe(false);
      }
    }
  });

  it('third-party shelves (Live/Parks) stream from an external origin (absolute)', () => {
    for (const s of c.scenes) {
      if (s.shelf === 'live' || s.shelf === 'parks') {
        expect(isAbsoluteUrl(s.src), `${s.id} should be an absolute third-party URL`).toBe(true);
      }
    }
  });
});
