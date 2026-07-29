import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { youTubeEmbeds, isYouTubeHost, hostOf, type Catalog } from '../../src/catalog';

// Constraint C1, as a test: no YouTube iframe can enter the bundle. We scan the
// shipped scenes.json (the ONLY place content lives) directly from disk — the
// RAW parsed scenes, not the validated subset — so a smuggled YouTube embed is
// caught even though the validator would also reject it. build.mjs enforces the
// same rule as a hard build failure; three layers, one law.
const raw = JSON.parse(readFileSync(new URL('../../scenes.json', import.meta.url), 'utf8')) as Catalog;

describe('C1: no YouTube embeds anywhere', () => {
  it('the shipped scenes.json contains zero YouTube embeds', () => {
    expect(youTubeEmbeds(raw)).toEqual([]);
  });

  it('every embed scene points at a non-YouTube host', () => {
    for (const s of raw.scenes) {
      if (s.kind === 'embed') expect(isYouTubeHost(hostOf(s.src))).toBe(false);
    }
  });

  it('the guard DOES flag a crafted YouTube embed (the law has teeth)', () => {
    const evil: Catalog = {
      mediaBase: '',
      scenes: [
        { id: 'evil', shelf: 'live', title: 'x', kind: 'embed', src: 'https://www.youtube.com/embed/abc', license: 'explore-fan', credit: 'x', creditUrl: 'x' },
        { id: 'evil2', shelf: 'live', title: 'y', kind: 'embed', src: 'https://youtu.be/abc', license: 'explore-fan', credit: 'y', creditUrl: 'y' },
      ],
    };
    expect(youTubeEmbeds(evil)).toEqual(['evil', 'evil2']);
  });

  it('isYouTubeHost catches the properties and their subdomains', () => {
    for (const h of ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'youtu.be']) {
      expect(isYouTubeHost(h)).toBe(true);
    }
    expect(isYouTubeHost('explore.org')).toBe(false);
    expect(isYouTubeHost('nps.gov')).toBe(false);
  });
});
