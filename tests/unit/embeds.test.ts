import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateCatalog, isYouTubeHost, hostOf, type Catalog } from '../../src/catalog';

// View is a discovery portal: it EMBEDS the source's own player in place so a
// viewer never has to leave view.croft.ing. explore.org serves its live cams
// only through YouTube, so Live scenes are YouTube embeds.
//
// This REVERSES the original constraint C1 ("no YouTube, ever", to guarantee no
// ads). The owner chose the embed over an external link, accepting that the
// source's player may carry the source's ads (to be revisited if it becomes a
// problem). The old law is kept in history — see plans/ and RUN-P4-SUMMARY.md,
// marked superseded.
const raw = JSON.parse(readFileSync(new URL('../../scenes.json', import.meta.url), 'utf8')) as Catalog;

describe('Live cams embed the source player (portal model)', () => {
  it('every Live scene is an embed, not a bare link', () => {
    const live = raw.scenes.filter((s) => s.shelf === 'live');
    expect(live.length).toBeGreaterThan(0);
    for (const s of live) expect(s.kind).toBe('embed');
  });

  it('Live embeds point at YouTube — explore.org has no other player', () => {
    for (const s of raw.scenes) {
      if (s.shelf === 'live') {
        expect(isYouTubeHost(hostOf(s.src)), `${s.id} should be a YouTube embed`).toBe(true);
      }
    }
  });

  it('the validator ACCEPTS a YouTube embed now (C1 reversed)', () => {
    const cat: Catalog = {
      mediaBase: '',
      scenes: [
        {
          id: 'yt',
          shelf: 'live',
          title: 'x',
          kind: 'embed',
          src: 'https://www.youtube.com/embed/abc',
          license: 'explore-fan',
          credit: 'x',
          creditUrl: 'https://explore.org/x',
        },
      ],
    };
    const { catalog, problems } = validateCatalog(cat);
    expect(problems).toEqual([]);
    expect(catalog?.scenes).toHaveLength(1);
  });
});
