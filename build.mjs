// View build: bundle the TS app with esbuild, content-hash each entry, inject a
// build-time CSP + Subresource Integrity, generate a version-stamped service
// worker, and emit a self-contained static dist/ (Croft chassis pattern — no
// framework, no router). One command, mirrored by CI.
//
// View-specific: scenes.json is copied verbatim and validated at build time. The
// CSP's media/img/frame origins are DERIVED from scenes.json + mediaBase, so each
// origin the catalog references (an NPS stream, a YouTube embed, an R2 mediaBase)
// gets in and nothing more. (The old constraint C1 — no YouTube embeds, ever — is
// reversed under the portal model; see docs, marked superseded.)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');

/** Build stamp: package version + short git SHA (falls back gracefully). */
function computeVersion() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  let sha = 'nogit';
  try {
    sha = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { cwd: root }).toString().trim();
  } catch {
    // No git (e.g. tarball build) — leave the sentinel.
  }
  return `v0 ${pkg.version}+${sha}`;
}

const version = computeVersion();

// Pre-paint theme init: byte-identical across every page (injected via the
// %THEME_INIT% token, never hand-copied), so ONE CSP hash covers it. Keep this
// in sync with src/theme.ts resolveTheme(); the unit test pins the shared logic.
const THEME_INIT_JS =
  "(function(){try{var t=localStorage.getItem('croft-theme');" +
  "if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}" +
  "document.documentElement.setAttribute('data-theme',t);}catch(e){}})();";

function sha256base64(text) {
  return createHash('sha256').update(text, 'utf8').digest('base64');
}
function sriFor(bytes) {
  return 'sha384-' + createHash('sha384').update(bytes).digest('base64');
}

// Each destination: root HTML template, TS entry, and the template tokens for
// its hashed script src + SRI (page-per-destination shape).
const PAGES = [
  { html: 'index.html', entry: 'src/pages/index.ts', jsToken: '%INDEX_JS%', sriToken: '%INDEX_JS_SRI%' },
  { html: 'about.html', entry: 'src/pages/about.ts', jsToken: '%ABOUT_JS%', sriToken: '%ABOUT_JS_SRI%' },
  { html: 'settings.html', entry: 'src/pages/settings.ts', jsToken: '%SETTINGS_JS%', sriToken: '%SETTINGS_JS_SRI%' },
  { html: 'metrics.html', entry: 'src/pages/metrics.ts', jsToken: '%METRICS_JS%', sriToken: '%METRICS_JS_SRI%' },
  { html: 'offline.html', entry: 'src/pages/offline.ts', jsToken: '%OFFLINE_JS%', sriToken: '%OFFLINE_JS_SRI%' },
];

// --- CSP origins, from scenes.json -------------------------------------------
// A tiny, dependency-free mirror of src/catalog.ts's host logic (build.mjs is
// plain JS and cannot import the TS module). The authoritative version is tested
// in tests/unit; this is the build gate.
function isAbsolute(src) {
  return /^(https?:)?\/\//i.test(src);
}
function originOf(src) {
  if (!isAbsolute(src)) return null;
  try {
    return new URL(src.startsWith('//') ? `https:${src}` : src).origin;
  } catch {
    return null;
  }
}

const scenesRaw = readFileSync(join(root, 'scenes.json'), 'utf8');
const scenes = JSON.parse(scenesRaw);
const mediaBase = typeof scenes.mediaBase === 'string' ? scenes.mediaBase : '';
const mediaOrigins = new Set();
const frameOrigins = new Set();
const imgOrigins = new Set();
const baseOrigin = originOf(mediaBase);
if (baseOrigin) {
  mediaOrigins.add(baseOrigin);
  imgOrigins.add(baseOrigin);
}
for (const s of scenes.scenes ?? []) {
  if (s.kind === 'embed') {
    // Portal model: embeds are allowed, including YouTube (explore.org's only
    // player). The origin joins frame-src so the CSP permits exactly it. This
    // reverses the old C1 build-time YouTube throw — see docs, marked superseded.
    const o = originOf(s.src);
    if (o) frameOrigins.add(o);
  }
  if (s.kind === 'video') {
    const o = originOf(s.src);
    if (o) mediaOrigins.add(o);
  }
  const po = originOf(s.poster ?? '');
  if (po) imgOrigins.add(po);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// 1. Bundle the app entries; hashed filenames let the SW cache-bust safely.
const result = await esbuild.build({
  entryPoints: PAGES.map((p) => join(root, p.entry)),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  sourcemap: true,
  entryNames: 'assets/[name]-[hash]',
  outdir: dist,
  metafile: true,
  define: { __CROFT_VERSION__: JSON.stringify(version) },
});

function entryHref(srcEntry) {
  const rel = srcEntry.split('\\').join('/');
  const outputs = result.metafile.outputs;
  const match = Object.keys(outputs).find(
    (o) => o.endsWith('.js') && outputs[o].entryPoint && outputs[o].entryPoint.endsWith(rel),
  );
  if (!match) throw new Error(`build: could not locate bundled entry for ${srcEntry}`);
  return match.replace(/^dist\//, '');
}
const pageHrefs = Object.fromEntries(PAGES.map((p) => [p.entry, entryHref(p.entry)]));

// 2. Served stylesheet = tokens.css (only place raw hex lives) then styles.css.
const stylesCss = `${readFileSync(join(root, 'tokens.css'), 'utf8')}\n${readFileSync(join(root, 'styles.css'), 'utf8')}`;
writeFileSync(join(dist, 'styles.css'), stylesCss);
const stylesSri = sriFor(Buffer.from(stylesCss, 'utf8'));
const stylesHref = `styles.css?v=${encodeURIComponent(version)}`;

// 3. Copy static assets verbatim. scenes.json is the content system (served as a
// static asset). CNAME (if present) carries the GitHub Pages custom domain.
for (const asset of ['manifest.webmanifest', 'icons', 'scenes.json', 'CNAME', 'LICENSE']) {
  const from = join(root, asset);
  if (existsSync(from)) cpSync(from, join(dist, asset), { recursive: true });
}
writeFileSync(join(dist, '.nojekyll'), '');

// 4. Precache manifest keyed to this build. Relative to the SW's own scope, so
// precache works at a domain root or under a subpath. NB: media/ is deliberately
// NOT precached (the SW passes it through — build plan 1.3).
const precache = [
  './',
  ...PAGES.map((p) => p.html),
  'manifest.webmanifest',
  'icons/icon.svg',
  'scenes.json',
  stylesHref,
  ...PAGES.map((p) => pageHrefs[p.entry]),
];

// 5. Generate the service worker (stable name, no hash). The offline fallback
// page name is injected too.
await esbuild.build({
  entryPoints: [join(root, 'src/sw.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: true,
  outfile: join(dist, 'sw.js'),
  define: {
    __PRECACHE__: JSON.stringify(precache),
    __CACHE__: JSON.stringify(`view-${version.replace(/[^\w.+-]/g, '_')}`),
    __OFFLINE__: JSON.stringify('offline.html'),
  },
});

// 6. Per-page SRI for the hashed JS.
const jsSri = Object.fromEntries(
  PAGES.map((p) => {
    const file = join(dist, pageHrefs[p.entry].replace(/^\//, ''));
    return [p.entry, sriFor(readFileSync(file))];
  }),
);

// 7. Build-time CSP. default-src 'none' + explicit allowlists; the inline theme
// script is admitted by its sha256 (never 'unsafe-inline'). media/img/frame are
// widened only to the origins scenes.json actually references (empty by default
// — local media is 'self'/relative; a remote mediaBase adds exactly its origin).
const list = (...xs) => xs.filter(Boolean).join(' ');
const cspParts = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  // NB: frame-ancestors is intentionally omitted — ignored in a <meta> CSP (must
  // be an HTTP header). The static host sets it; see docs/SECURITY-derived notes.
  `img-src ${list("'self'", 'data:', ...imgOrigins)}`,
  `media-src ${list("'self'", 'data:', 'blob:', ...mediaOrigins)}`,
  "font-src 'self'",
  "style-src 'self'",
  "manifest-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  `script-src 'self' 'sha256-${sha256base64(THEME_INIT_JS)}'`,
];
if (frameOrigins.size > 0) cspParts.splice(3, 0, `frame-src ${list(...frameOrigins)}`);
const csp = cspParts.join('; ');

// 8. Render each HTML page from its template, injecting everything above.
const themeInitTag = `<script>${THEME_INIT_JS}</script>`;
for (const p of PAGES) {
  const template = readFileSync(join(root, p.html), 'utf8');
  const html = template
    .replaceAll('%CSP%', csp)
    .replaceAll('%THEME_INIT%', themeInitTag)
    .replaceAll('%STYLES%', stylesHref)
    .replaceAll('%STYLES_SRI%', stylesSri)
    .replaceAll(p.jsToken, pageHrefs[p.entry])
    .replaceAll(p.sriToken, jsSri[p.entry]);
  // Standard: paths are RELATIVE, so the site works at a domain root or under a
  // subpath. An absolute-root href/src would 404 under a subpath — fail the
  // build, not the deploy.
  const absolute = html.match(/(?:href|src)="\/[^"]*"/g);
  if (absolute) {
    throw new Error(
      `build: ${p.html} has absolute-root asset path(s) ${JSON.stringify(absolute)} — ` +
        `use a relative path so the site works under a subpath.`,
    );
  }
  writeFileSync(join(dist, p.html), html);
}

// 9. Bundle-size budget — a tripwire against accidental bloat.
const PAGE_JS_GZ_BUDGET = 24 * 1024;
const CSS_GZ_BUDGET = 12 * 1024;
const gz = (file) => gzipSync(readFileSync(file)).length;
const sizes = PAGES.map((p) => ({ page: p.html, gz: gz(join(dist, pageHrefs[p.entry])) }));
const cssGz = gz(join(dist, 'styles.css'));
const kb = (n) => `${(n / 1024).toFixed(1)}K`;
console.log(
  'sizes(gz): ' +
    sizes.map((s) => `${s.page.replace('.html', '')} ${kb(s.gz)}`).join(' · ') +
    ` · styles.css ${kb(cssGz)}`,
);
const over = sizes.filter((s) => s.gz > PAGE_JS_GZ_BUDGET);
if (over.length > 0) {
  throw new Error(
    `build: bundle-size budget exceeded (${kb(PAGE_JS_GZ_BUDGET)} gz/page):\n` +
      over.map((s) => `  ${s.page}: ${kb(s.gz)} gz`).join('\n'),
  );
}
if (cssGz > CSS_GZ_BUDGET) {
  throw new Error(`build: styles.css ${kb(cssGz)} gz exceeds the ${kb(CSS_GZ_BUDGET)} budget.`);
}

console.log(
  `built ${version} -> dist/  (${PAGES.length} pages, sw + precache ${precache.length}, CSP+SRI on, budget ok)`,
);
