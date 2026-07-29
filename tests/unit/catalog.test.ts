import { describe, it, expect } from 'vitest';
import {
  validateCatalog,
  scenesOnShelf,
  sceneById,
  isAbsoluteUrl,
  hostOf,
  type Catalog,
} from '../../src/catalog';

const good = {
  mediaBase: '',
  scenes: [
    { id: 'a', shelf: 'parks', title: 'A', kind: 'video', src: 'media/parks/a.mp4', license: 'public-domain', credit: 'NPS — public domain', creditUrl: 'https://nps.gov/a', loop: true },
    { id: 'b', shelf: 'live', title: 'B', kind: 'link', src: 'https://explore.org/livecams/b', license: 'explore-fan', credit: 'B', creditUrl: 'https://explore.org/livecams/b' },
  ],
};

describe('validateCatalog', () => {
  it('accepts a well-formed catalog and returns no problems', () => {
    const { catalog, problems } = validateCatalog(good);
    expect(problems).toEqual([]);
    expect(catalog?.scenes).toHaveLength(2);
    expect(catalog?.mediaBase).toBe('');
  });

  it('flags a bad shelf/kind/license and a missing required field', () => {
    const { problems } = validateCatalog({
      mediaBase: '',
      scenes: [{ id: 'x', shelf: 'nope', title: '', kind: 'gif', src: 'x', license: 'mit', credit: 'c', creditUrl: 'u' }],
    });
    expect(problems.join('\n')).toMatch(/bad `shelf`/);
    expect(problems.join('\n')).toMatch(/bad `kind`/);
    expect(problems.join('\n')).toMatch(/bad `license`/);
    expect(problems.join('\n')).toMatch(/missing `title`/);
  });

  it('flags a duplicate id', () => {
    const dup = { mediaBase: '', scenes: [good.scenes[0], good.scenes[0]] };
    expect(validateCatalog(dup).problems.join('\n')).toMatch(/duplicate `id`/);
  });

  it('keeps the valid subset when some scenes are bad (skip-and-log posture)', () => {
    const mixed = { mediaBase: '', scenes: [good.scenes[0], { id: 'bad' }] };
    const { catalog, problems } = validateCatalog(mixed);
    expect(problems.length).toBeGreaterThan(0);
    expect(catalog?.scenes.map((s) => s.id)).toEqual(['a']);
  });

  it('rejects a non-object top level', () => {
    expect(validateCatalog(null).catalog).toBeNull();
  });
});

describe('helpers', () => {
  const catalog = validateCatalog(good).catalog as Catalog;
  it('scenesOnShelf filters by shelf, preserving order', () => {
    expect(scenesOnShelf(catalog, 'parks').map((s) => s.id)).toEqual(['a']);
    expect(scenesOnShelf(catalog, 'mine')).toEqual([]);
  });
  it('sceneById finds a scene', () => {
    expect(sceneById(catalog, 'b')?.title).toBe('B');
    expect(sceneById(catalog, 'zzz')).toBeUndefined();
  });
  it('isAbsoluteUrl / hostOf classify urls', () => {
    expect(isAbsoluteUrl('https://x.com/a')).toBe(true);
    expect(isAbsoluteUrl('media/a.mp4')).toBe(false);
    expect(hostOf('https://Explore.org/a')).toBe('explore.org');
    expect(hostOf('media/a.mp4')).toBe('');
  });
});
