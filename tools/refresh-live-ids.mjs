// refresh-live-ids — re-derive each Live cam's current YouTube video id from its
// explore.org page and rewrite scenes.json.
//
// explore.org serves its cams only through YouTube, and a live broadcast's video
// id changes when the stream restarts. For explore's perpetual cams that is rare
// (the aurora cam has held one id since 2023); seasonal cams (e.g. Brooks Falls)
// rotate ~yearly. This turns the occasional refresh into one command — or a
// manual CI workflow.
//
//   node tools/refresh-live-ids.mjs          # rewrite scenes.json in place
//   node tools/refresh-live-ids.mjs --check  # report drift, exit 1 if stale (no write)
//
// Live scenes are matched by shelf==='live' + kind==='embed' on a YouTube host;
// the explore page is the scene's creditUrl. Fail loud: if any id can't be
// derived, nothing is written and the process exits non-zero.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCENES = fileURLToPath(new URL('../scenes.json', import.meta.url));

/** The 11-char YouTube video id in a `.../embed/<id>?...` URL, or null. */
export function youTubeIdFromEmbed(src) {
  const m = /\/embed\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/.exec(src);
  return m ? m[1] : null;
}

/** Replace the embed id in a YouTube embed URL, preserving host and query. */
export function replaceEmbedId(src, newId) {
  return src.replace(/(\/embed\/)[A-Za-z0-9_-]{11}/, `$1${newId}`);
}

/** Last non-empty path segment of a URL (the explore cam slug). */
export function slugFromUrl(url) {
  const path = new URL(url).pathname.replace(/\/+$/, '');
  return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * The current YouTube id for a cam in explore's page HTML. explore ships RSC
 * flight data as `embed/<id>...","slug":"<slug>"` with backslash-escaped quotes;
 * unescape, then match the id whose object carries this slug. null if absent.
 */
export function extractCurrentId(html, slug) {
  const text = html.replace(/\\"/g, '"');
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`embed/([A-Za-z0-9_-]{11})[^"]*","slug":"${esc}"`).exec(text);
  return m ? m[1] : null;
}

function isYouTubeSrc(src) {
  const host = new URL(src).hostname;
  return /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(host);
}

async function main() {
  const check = process.argv.includes('--check');
  const raw = readFileSync(SCENES, 'utf8');
  const catalog = JSON.parse(raw);
  const live = (catalog.scenes ?? []).filter(
    (s) => s.shelf === 'live' && s.kind === 'embed' && isYouTubeSrc(s.src),
  );
  if (live.length === 0) {
    console.log('refresh-live-ids: no Live YouTube embeds in scenes.json — nothing to do.');
    return;
  }

  const changes = [];
  const failures = [];
  for (const s of live) {
    const slug = slugFromUrl(s.creditUrl);
    let current = null;
    try {
      const res = await fetch(s.creditUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      current = extractCurrentId(await res.text(), slug);
    } catch (err) {
      failures.push(`${s.id}: fetch/parse failed (${err.message})`);
      continue;
    }
    if (!current) {
      failures.push(`${s.id}: no YouTube id for slug "${slug}" at ${s.creditUrl}`);
      continue;
    }
    if (current !== youTubeIdFromEmbed(s.src)) {
      changes.push({ id: s.id, from: youTubeIdFromEmbed(s.src), to: current, src: s.src });
    }
  }

  // Fail loud: a partial resolve must not silently rewrite a subset.
  if (failures.length) {
    console.error('refresh-live-ids: FAILED to resolve some cams (nothing written):');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  if (changes.length === 0) {
    console.log(`refresh-live-ids: all ${live.length} Live cam id(s) are current.`);
    return;
  }

  for (const c of changes) console.log(`  ${c.id}: ${c.from} -> ${c.to}`);

  if (check) {
    console.error(
      `refresh-live-ids: ${changes.length} Live cam id(s) are stale (run without --check to update).`,
    );
    process.exit(1);
  }

  // Minimal-diff rewrite: swap only the changed src strings in the raw text.
  let out = raw;
  for (const c of changes) out = out.replace(c.src, replaceEmbedId(c.src, c.to));
  writeFileSync(SCENES, out);
  console.log(`refresh-live-ids: updated ${changes.length} id(s) in scenes.json.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
