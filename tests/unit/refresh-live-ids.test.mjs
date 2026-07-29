import { describe, it, expect } from 'vitest';
import {
  youTubeIdFromEmbed,
  replaceEmbedId,
  slugFromUrl,
  extractCurrentId,
} from '../../tools/refresh-live-ids.mjs';

// The refresh tool re-derives each Live cam's current YouTube video id from its
// explore.org page and rewrites scenes.json. These are its pure helpers — the
// I/O (fetch + fs) is verified by running the tool; the parsing is tested here.

describe('youTubeIdFromEmbed', () => {
  it('reads the 11-char video id from an embed URL, ignoring query', () => {
    expect(youTubeIdFromEmbed('https://www.youtube.com/embed/oORXfTviuCs?rel=0&mute=1')).toBe(
      'oORXfTviuCs',
    );
  });
  it('returns null for a non-embed URL', () => {
    expect(youTubeIdFromEmbed('https://explore.org/livecams/x')).toBeNull();
  });
});

describe('replaceEmbedId', () => {
  it('swaps the id and preserves host + query params', () => {
    expect(
      replaceEmbedId('https://www.youtube.com/embed/OLD11charXX?rel=0&autoplay=1&mute=1', 'NEWidHere00'),
    ).toBe('https://www.youtube.com/embed/NEWidHere00?rel=0&autoplay=1&mute=1');
  });
});

describe('slugFromUrl', () => {
  it('takes the last non-empty path segment', () => {
    expect(slugFromUrl('https://explore.org/livecams/african-wildlife/my-cam')).toBe('my-cam');
  });
  it('tolerates a trailing slash', () => {
    expect(slugFromUrl('https://explore.org/livecams/african-wildlife/my-cam/')).toBe('my-cam');
  });
});

describe('extractCurrentId', () => {
  // explore ships RSC flight data where each cam is `embed/<id>...","slug":"<slug>"`,
  // with quotes backslash-escaped. The helper unescapes then matches per slug.
  const html =
    'x embed/AAAAAAAAAAA?rel=0\\",\\"slug\\":\\"other-cam\\" y ' +
    'embed/BBBBBBBBBBB?rel=0&mute=1\\",\\"slug\\":\\"target-cam\\" z';

  it('returns the id whose object carries the requested slug', () => {
    expect(extractCurrentId(html, 'target-cam')).toBe('BBBBBBBBBBB');
    expect(extractCurrentId(html, 'other-cam')).toBe('AAAAAAAAAAA');
  });
  it('returns null when the slug is absent', () => {
    expect(extractCurrentId(html, 'missing-cam')).toBeNull();
  });
});
