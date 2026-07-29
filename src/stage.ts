// The stage — the window. Renders one scene at a time through the glass frame,
// with a credit chip beside it (constraint C2) and a soft crossfade between
// scenes (cut under prefers-reduced-motion). Three kinds:
//
//   video → native <video muted autoplay loop playsinline>, e.g. the NPS streams
//           on the Parks shelf.
//   embed → sandboxed <iframe> filling the stage, e.g. the explore.org live cams
//           on the Live shelf (served through YouTube — the old no-YouTube
//           constraint C1 is reversed under the portal model; see docs).
//   link  → a poster card with an external-arrow button that opens the source in
//           a new tab (kept for any source with no embeddable player).
//
// video and embed are heavy remote media: ambient (kiosk) scenes attach + play
// immediately; browsing scenes wait for a tap ("Open this view") so a page never
// eagerly pulls a stream on load. Both carry a fullscreen control.
import type { Catalog, Scene } from './catalog';
import { resolveMediaUrl } from './catalog';
import { creditFor } from './license';

export interface StageOptions {
  /** Kiosk/ambient: attach and play video immediately instead of tap-to-play. */
  readonly autoplay?: boolean;
  /** Cut instead of crossfade (honours prefers-reduced-motion). */
  readonly reducedMotion?: boolean;
}

export interface StageHandle {
  /** The window element (the `.stage`). */
  readonly stageEl: HTMLElement;
  /** The credit chip element, kept in sync with the shown scene. */
  readonly creditEl: HTMLElement;
  /** Swap to a scene, crossfading unless reduced-motion. */
  show(scene: Scene): void;
  /** The scene currently shown, if any. */
  current(): Scene | null;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function posterPlaceholder(): HTMLElement {
  // In-brand, no-network poster: a calm horizon through glass (CSS-drawn).
  return el('div', 'stage-poster');
}

function buildVideo(scene: Scene, catalog: Catalog): HTMLVideoElement {
  const video = document.createElement('video');
  video.muted = true;
  video.autoplay = true;
  video.loop = scene.loop ?? true;
  video.playsInline = true;
  video.setAttribute('preload', 'auto');
  if (scene.poster) video.poster = resolveMediaUrl(catalog.mediaBase, scene.poster);
  video.src = resolveMediaUrl(catalog.mediaBase, scene.src);
  // Degrade gracefully: if the stream can't load — offline / 404 / decode error,
  // or a third-party source that's down — fall back to the calm CSS poster
  // instead of leaving an empty, broken <video> box (DEPLOY.md: a window shows a
  // poster until its media exists).
  video.addEventListener('error', () => video.replaceWith(posterPlaceholder()), { once: true });
  // Autoplay may be refused; swallow the rejection (progressive enhancement).
  void video.play?.().catch(() => {});
  return video;
}

function buildEmbed(scene: Scene): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.src = scene.src;
  iframe.title = scene.title;
  iframe.allow = 'autoplay; fullscreen; encrypted-media';
  // Sandboxed per chassis security conventions: scripts + same-origin for the
  // player to run, presentation/popups for fullscreen and "open source". Never
  // allow-top-navigation.
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
  iframe.setAttribute('loading', 'lazy');
  return iframe;
}

function fullscreenButton(): HTMLButtonElement {
  // Go fullscreen on the .stage (the glass frame), not the bare media, so the
  // window aesthetic survives fullscreen. A portal viewer never has to leave
  // view.croft.ing to fill the screen.
  const btn = el('button', 'stage-fs');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Fullscreen');
  btn.setAttribute('data-testid', 'stage-fullscreen');
  btn.addEventListener('click', () => {
    const target = btn.closest('.stage') ?? btn.parentElement;
    void (target as HTMLElement | null)?.requestFullscreen?.().catch(() => {});
  });
  return btn;
}

function externalButton(label: string, href: string): HTMLAnchorElement {
  const a = el('a', 'btn btn-primary stage-play', label);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

/** Build the media layer for a scene. `autoplay` forces immediate video attach. */
function buildMedia(scene: Scene, catalog: Catalog, autoplay: boolean): HTMLElement {
  const layer = el('div', 'stage-media');
  if (scene.kind === 'link') {
    layer.append(posterPlaceholder(), externalButton(`Open at the source →`, scene.src));
    return layer;
  }
  // video | embed — both are heavy remote media (an NPS stream, a YouTube
  // player). A fullscreen control rides with the media so a viewer can fill the
  // screen without leaving view.croft.ing.
  const attach = (): HTMLElement =>
    scene.kind === 'embed' ? buildEmbed(scene) : buildVideo(scene, catalog);
  // Ambient (kiosk) mode attaches and plays immediately; browsing mode waits for
  // a tap so a page never eagerly pulls a stream — or loads a YouTube iframe —
  // on load.
  if (autoplay) {
    layer.append(attach(), fullscreenButton());
    return layer;
  }
  const poster = posterPlaceholder();
  const play = el('button', 'btn btn-primary stage-play', 'Open this view');
  play.addEventListener('click', () => {
    layer.replaceChildren(attach(), fullscreenButton());
  });
  layer.append(poster, play);
  return layer;
}

export function renderCredit(scene: Scene): HTMLElement {
  const credit = el('div', 'credit');
  credit.setAttribute('data-testid', 'credit');
  const { label, credit: text, url } = creditFor(scene);
  credit.append(el('span', 'credit-license', label));
  const link = el('a', undefined, text);
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  credit.append(link);
  return credit;
}

export function createStage(catalog: Catalog, opts: StageOptions = {}): StageHandle {
  const stageEl = el('div', 'stage');
  stageEl.setAttribute('data-testid', 'stage');
  const creditEl = el('div', 'credit');
  let shown: Scene | null = null;

  function paintCredit(scene: Scene): void {
    const fresh = renderCredit(scene);
    creditEl.setAttribute('data-testid', 'credit');
    creditEl.replaceChildren(...Array.from(fresh.childNodes));
  }

  function show(scene: Scene): void {
    const next = buildMedia(scene, catalog, opts.autoplay ?? false);
    const prev = stageEl.querySelector('.stage-media');
    if (prev && !opts.reducedMotion) {
      next.classList.add('is-fading');
      // Synchronously take the outgoing layer out of the accessibility tree and
      // make it non-interactive, so its (now-stale) controls can't be found or
      // clicked at any point during the crossfade — no sub-frame window.
      prev.setAttribute('aria-hidden', 'true');
      (prev as HTMLElement).style.pointerEvents = 'none';
      stageEl.append(next);
      // Fade the old out, the new in, then drop the old.
      requestAnimationFrame(() => {
        (prev as HTMLElement).classList.add('is-fading');
        next.classList.remove('is-fading');
      });
      window.setTimeout(() => prev.remove(), 520);
    } else {
      stageEl.replaceChildren(next);
    }
    paintCredit(scene);
    shown = scene;
  }

  return { stageEl, creditEl, show, current: () => shown };
}
