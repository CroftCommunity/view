import { describe, it, expect } from 'vitest';
import { creditFor } from '../../src/license';

describe('license-template selection', () => {
  it('public-domain shows the scene credit verbatim with a PD label', () => {
    const c = creditFor({ license: 'public-domain', credit: 'National Park Service — public domain', creditUrl: 'https://nps.gov/a' });
    expect(c.label).toBe('Public domain');
    expect(c.credit).toBe('National Park Service — public domain');
    expect(c.url).toBe('https://nps.gov/a');
  });

  it('cc-by shows the owner credit with a CC BY label', () => {
    const c = creditFor({ license: 'cc-by', credit: '© croft — CC BY 4.0', creditUrl: 'https://creativecommons.org/licenses/by/4.0/' });
    expect(c.label).toBe('CC BY 4.0');
    expect(c.credit).toBe('© croft — CC BY 4.0');
  });

  it('explore-fan frames the credit as "Live from explore.org"', () => {
    const c = creditFor({ license: 'explore-fan', credit: 'Brooks Falls · Katmai, Alaska', creditUrl: 'https://explore.org/livecams/x' });
    expect(c.label).toBe('explore.org');
    expect(c.credit).toMatch(/^Live from explore\.org — Brooks Falls/);
  });
});
