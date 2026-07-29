// The catalog — View's content system. scenes.json (a static asset at the site
// root) is the ONLY place content lives; this module loads and validates it.
//
// Design law (the build plan): `mediaBase` is the single deploy-time switch —
// "" locally, an R2/CDN origin later — and every relative media `src` resolves
// under it. Absolute `src` values (e.g. the NPS public-domain URLs the Parks
// shelf references directly in this build) are used as-is.
//
// Constraint C1 (no ads, ever → no YouTube iframes anywhere) is enforced here as
// data: an `embed` scene whose host is a YouTube property is rejected. The same
// rule is asserted as a unit test that scans the shipped scenes.json, and as a
// build-time assertion in build.mjs — three layers, one law.

export type Shelf = 'live' | 'parks' | 'mine';
export type SceneKind = 'video' | 'embed' | 'link';
export type LicenseKind = 'public-domain' | 'cc-by' | 'explore-fan';

export interface Scene {
  readonly id: string;
  readonly shelf: Shelf;
  readonly title: string;
  readonly kind: SceneKind;
  /** video: media path/URL · embed: iframe URL · link: external page URL. */
  readonly src: string;
  readonly poster?: string;
  readonly license: LicenseKind;
  readonly credit: string;
  readonly creditUrl: string;
  readonly loop?: boolean;
}

export interface Catalog {
  /** "" locally; an R2/CDN origin later — the ONLY thing that changes at deploy. */
  readonly mediaBase: string;
  readonly scenes: readonly Scene[];
}

/** The three shelves, in the fixed product order: Live · Parks · Mine. */
export const SHELVES: readonly { readonly id: Shelf; readonly label: string }[] = [
  { id: 'live', label: 'Live' },
  { id: 'parks', label: 'Parks' },
  { id: 'mine', label: 'Mine' },
];

const SHELF_IDS = new Set<Shelf>(['live', 'parks', 'mine']);
const KINDS = new Set<SceneKind>(['video', 'embed', 'link']);
const LICENSES = new Set<LicenseKind>(['public-domain', 'cc-by', 'explore-fan']);

// Constraint C1: YouTube's ToS lets it monetise embedded content, so no YouTube
// property may ever be embedded. Host suffixes, matched case-insensitively.
const FORBIDDEN_EMBED_HOSTS: readonly string[] = [
  'youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
];

export function isAbsoluteUrl(src: string): boolean {
  return /^(https?:)?\/\//i.test(src);
}

/** Host of an absolute URL, lowercased; '' for a relative path (no host). */
export function hostOf(src: string): string {
  if (!isAbsoluteUrl(src)) return '';
  try {
    // Protocol-relative URLs need a base to parse.
    const normalised = src.startsWith('//') ? `https:${src}` : src;
    return new URL(normalised).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** True if a host is a YouTube property (exact or subdomain). Constraint C1. */
export function isYouTubeHost(host: string): boolean {
  const h = host.toLowerCase();
  return FORBIDDEN_EMBED_HOSTS.some((bad) => h === bad || h.endsWith(`.${bad}`));
}

/**
 * Resolve a scene's media URL against `mediaBase`. Absolute `src` is returned
 * unchanged; a relative `src` is joined under `mediaBase` (which is "" locally,
 * so it stays relative and works from the site root). This is the whole of the
 * deploy-time media switch — proven by tests/unit/mediabase.test.ts.
 */
export function resolveMediaUrl(mediaBase: string, src: string): string {
  if (isAbsoluteUrl(src)) return src;
  if (!mediaBase) return src;
  return `${mediaBase.replace(/\/+$/, '')}/${src.replace(/^\/+/, '')}`;
}

/** Scenes on the shelf, preserving catalog order. */
export function scenesOnShelf(catalog: Catalog, shelf: Shelf): readonly Scene[] {
  return catalog.scenes.filter((s) => s.shelf === shelf);
}

export function sceneById(catalog: Catalog, id: string): Scene | undefined {
  return catalog.scenes.find((s) => s.id === id);
}

/**
 * The C1 scan: every `embed` scene whose iframe host is a YouTube property.
 * Returns the offending scene ids ([] = clean). Used by the unit test against
 * the shipped scenes.json and by build.mjs as a hard build failure.
 */
export function youTubeEmbeds(catalog: Catalog): readonly string[] {
  return catalog.scenes
    .filter((s) => s.kind === 'embed' && isYouTubeHost(hostOf(s.src)))
    .map((s) => s.id);
}

/**
 * Validate a parsed catalog. Returns the valid-scene subset (a always-usable
 * `catalog`) AND a list of human problems (empty = wholly valid). Pure — no I/O
 * — so it is unit-tested deterministically and reused by the loader (fail loud
 * in dev, skip-and-log in prod) and by the build. `catalog` is null only when
 * the top-level shape is unusable.
 */
export function validateCatalog(data: unknown): { catalog: Catalog | null; problems: string[] } {
  const problems: string[] = [];
  if (typeof data !== 'object' || data === null) {
    return { catalog: null, problems: ['catalog: not an object'] };
  }
  const obj = data as Record<string, unknown>;
  const mediaBase = typeof obj['mediaBase'] === 'string' ? obj['mediaBase'] : '';
  if (typeof obj['mediaBase'] !== 'string') problems.push('catalog: `mediaBase` must be a string');
  const rawScenes = Array.isArray(obj['scenes']) ? (obj['scenes'] as unknown[]) : [];
  if (!Array.isArray(obj['scenes'])) problems.push('catalog: `scenes` must be an array');

  const seen = new Set<string>();
  const scenes: Scene[] = [];
  rawScenes.forEach((raw, i) => {
    const s = raw as Record<string, unknown>;
    const where = `scene[${i}]${typeof s['id'] === 'string' ? ` "${s['id']}"` : ''}`;
    const problem = (m: string): void => {
      problems.push(`${where}: ${m}`);
    };

    const id = s['id'];
    if (typeof id !== 'string' || id.length === 0) problem('missing `id`');
    else if (seen.has(id)) problem('duplicate `id`');
    else seen.add(id);

    const shelf = s['shelf'];
    if (typeof shelf !== 'string' || !SHELF_IDS.has(shelf as Shelf)) problem('bad `shelf`');

    const kind = s['kind'];
    if (typeof kind !== 'string' || !KINDS.has(kind as SceneKind)) problem('bad `kind`');

    const license = s['license'];
    if (typeof license !== 'string' || !LICENSES.has(license as LicenseKind)) {
      problem('bad `license`');
    }

    for (const req of ['title', 'src', 'credit', 'creditUrl'] as const) {
      if (typeof s[req] !== 'string' || s[req].length === 0) problem(`missing \`${req}\``);
    }

    // Constraint C1, at validation time: an embed may never point at YouTube.
    if (kind === 'embed' && typeof s['src'] === 'string' && isYouTubeHost(hostOf(s['src']))) {
      problem('embed host is a YouTube property — forbidden by constraint C1 (no ads, ever)');
    }

    // Only accept a scene that has no problems attributed to it.
    if (!problems.some((p) => p.startsWith(where))) {
      const scene: Scene = {
        id: id as string,
        shelf: shelf as Shelf,
        title: s['title'] as string,
        kind: kind as SceneKind,
        src: s['src'] as string,
        license: license as LicenseKind,
        credit: s['credit'] as string,
        creditUrl: s['creditUrl'] as string,
        ...(typeof s['poster'] === 'string' ? { poster: s['poster'] } : {}),
        ...(typeof s['loop'] === 'boolean' ? { loop: s['loop'] } : {}),
      };
      scenes.push(scene);
    }
  });

  return { catalog: { mediaBase, scenes }, problems };
}

/**
 * Fetch and validate scenes.json (relative, so it resolves at a domain root or a
 * subpath). `strict` fails loud (throws) on any problem — the dev posture; the
 * default skips-and-logs the bad scenes and returns the valid subset — the prod
 * posture. Logging is the caller's job (keeps this import-light).
 */
export async function loadCatalog(
  url = 'scenes.json',
  strict = false,
): Promise<{ catalog: Catalog; problems: string[] }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`catalog: fetch ${url} failed (${res.status})`);
  const data: unknown = await res.json();
  const { catalog, problems } = validateCatalog(data);
  if (!catalog) throw new Error(`catalog: unusable — ${problems.join('; ')}`);
  if (problems.length > 0 && strict) throw new Error(`catalog: invalid — ${problems.join('; ')}`);
  return { catalog, problems };
}
