// Per-scene licensing, rendered on-page (constraint C2: content licensing is
// explicit per scene). The `license` field on a scene selects the wording
// template; the scene supplies the specific credit + link. Pure — unit-tested.
import type { LicenseKind, Scene } from './catalog';

export interface CreditText {
  /** Short pill label for the license class. */
  readonly label: string;
  /** The full credit line shown beside the scene. */
  readonly credit: string;
  /** Where "learn more" / the source points. */
  readonly url: string;
}

const LABELS: Record<LicenseKind, string> = {
  'public-domain': 'Public domain',
  'cc-by': 'CC BY 4.0',
  'explore-fan': 'explore.org',
};

/**
 * Build the on-page credit for a scene from its license template + its own
 * credit/creditUrl. The template governs the *class* wording; the scene's
 * `credit` is the specific attribution.
 */
export function creditFor(scene: Pick<Scene, 'license' | 'credit' | 'creditUrl'>): CreditText {
  const label = LABELS[scene.license];
  let credit: string;
  switch (scene.license) {
    case 'public-domain':
      // e.g. "National Park Service — public domain"
      credit = scene.credit;
      break;
    case 'cc-by':
      credit = scene.credit;
      break;
    case 'explore-fan':
      // "Live from explore.org" framing; footage remains © explore.org.
      credit = `Live from explore.org — ${scene.credit}`;
      break;
  }
  return { label, credit, url: scene.creditUrl };
}
