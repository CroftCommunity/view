import { describe, it, expect } from 'vitest';
import { parseKiosk, nextIndex } from '../../src/kiosk';

describe('parseKiosk', () => {
  it('returns null when there is no kiosk param', () => {
    expect(parseKiosk('')).toBeNull();
    expect(parseKiosk('?foo=1')).toBeNull();
  });

  it('parses a specific scene id', () => {
    const cfg = parseKiosk('?kiosk=grca-north-rim-still');
    expect(cfg?.mode).toBe('scene');
    expect(cfg?.sceneId).toBe('grca-north-rim-still');
    expect(cfg?.everyMs).toBe(10 * 60 * 1000); // default 10 min
    expect(cfg?.idleMs).toBe(4000); // default 4 s
  });

  it('parses a shuffle shelf', () => {
    const cfg = parseKiosk('?kiosk=shuffle:parks');
    expect(cfg?.mode).toBe('shuffle');
    expect(cfg?.shelf).toBe('parks');
  });

  it('rejects an unknown shuffle shelf', () => {
    expect(parseKiosk('?kiosk=shuffle:nope')).toBeNull();
  });

  it('honours &every= and &idle= overrides (seconds → ms, clamped)', () => {
    const cfg = parseKiosk('?kiosk=shuffle:parks&every=1&idle=0.5');
    expect(cfg?.everyMs).toBe(1000);
    expect(cfg?.idleMs).toBe(500);
  });

  it('ignores a non-positive/garbage interval and falls back to the default', () => {
    expect(parseKiosk('?kiosk=shuffle:parks&every=0')?.everyMs).toBe(10 * 60 * 1000);
    expect(parseKiosk('?kiosk=shuffle:parks&every=x')?.everyMs).toBe(10 * 60 * 1000);
  });
});

describe('nextIndex — shuffle advance wraps', () => {
  it('advances and wraps at the end', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
  });
  it('is safe for an empty shelf', () => {
    expect(nextIndex(0, 0)).toBe(0);
  });
});
