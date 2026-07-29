// Home page entry — the app. The hero IS the window: a stage playing a scene,
// with the Live · Parks · Mine shelves beneath it. Also the kiosk boot target
// (?kiosk=<sceneId> or ?kiosk=shuffle:<shelf>). Page bootstrap follows the fixed
// Croft idiom — get #app (throw if absent), build the shell, register the SW.
import { mountShell } from '../nav';
import { registerServiceWorker } from '../sw-register';
import { log } from '../log';
import { measure } from '../measure/measure';
import {
  loadCatalog,
  scenesOnShelf,
  sceneById,
  SHELVES,
  type Catalog,
  type Scene,
  type Shelf,
} from '../catalog';
import { createStage } from '../stage';
import { parseKiosk, nextIndex, mountKioskOverlay, type KioskConfig } from '../kiosk';

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

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** First non-empty shelf in product order (Live · Parks · Mine). */
function defaultShelf(catalog: Catalog): Shelf | null {
  const nonEmpty = SHELVES.find((s) => scenesOnShelf(catalog, s.id).length > 0);
  return nonEmpty ? nonEmpty.id : null;
}

// ---- Normal browsing mode ---------------------------------------------------

function renderApp(app: HTMLElement, catalog: Catalog): void {
  const section = el('section', 'panel');
  section.append(el('h1', undefined, 'Put a window where there isn’t one.'));

  const stage = createStage(catalog, { reducedMotion: reducedMotion() });
  section.append(stage.stageEl, stage.creditEl);

  // Shelf nav (Live · Parks · Mine).
  const shelfNav = el('nav', 'shelf-nav');
  shelfNav.setAttribute('aria-label', 'Shelves');
  const rail = el('ul', 'rail');
  rail.setAttribute('data-testid', 'rail');

  let activeShelf: Shelf | null = defaultShelf(catalog);

  const showScene = (scene: Scene, cards: HTMLElement): void => {
    stage.show(scene);
    measure.record('feature_scene_open');
    for (const c of Array.from(cards.querySelectorAll('.scene-card'))) {
      c.setAttribute('aria-current', c.getAttribute('data-scene') === scene.id ? 'true' : 'false');
    }
  };

  const paintRail = (shelf: Shelf): void => {
    const scenes = scenesOnShelf(catalog, shelf);
    rail.replaceChildren();
    if (scenes.length === 0) {
      const li = el('li', 'rail-item');
      li.style.gridColumn = '1 / -1';
      const empty = el('div', 'empty', 'Nothing here yet — the first view is coming.');
      li.append(empty);
      rail.append(li);
      stage.stageEl.replaceChildren(el('div', 'stage-poster'));
      stage.creditEl.replaceChildren();
      return;
    }
    for (const scene of scenes) {
      const li = el('li', 'rail-item');
      const card = el('button', 'scene-card');
      card.type = 'button';
      card.setAttribute('data-scene', scene.id);
      card.setAttribute('data-testid', 'scene-card');
      const thumb = el('div', 'scene-thumb');
      const meta = el('div', 'scene-meta');
      meta.append(el('span', 'scene-title', scene.title));
      const sub = el('span', 'scene-sub');
      sub.textContent = scene.kind === 'link' ? 'Open at the source →' : scene.credit;
      meta.append(sub);
      card.append(thumb, meta);
      card.addEventListener('click', () => showScene(scene, rail));
      li.append(card);
      rail.append(li);
    }
    const first = scenes[0];
    if (first) showScene(first, rail);
  };

  for (const shelf of SHELVES) {
    const btn = el('button', 'shelf-btn', shelf.label);
    btn.type = 'button';
    btn.setAttribute('data-shelf', shelf.id);
    btn.setAttribute('aria-pressed', String(shelf.id === activeShelf));
    btn.addEventListener('click', () => {
      if (shelf.id === activeShelf) return;
      activeShelf = shelf.id;
      for (const b of Array.from(shelfNav.querySelectorAll('.shelf-btn'))) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-shelf') === shelf.id));
      }
      measure.record('feature_shelf_switch');
      paintRail(shelf.id);
    });
    shelfNav.append(btn);
  }

  section.append(shelfNav, rail);
  mountShell(app, section);

  if (activeShelf) {
    paintRail(activeShelf);
  } else {
    stage.stageEl.replaceChildren(el('div', 'stage-poster'));
    const li = el('li', 'rail-item');
    li.style.gridColumn = '1 / -1';
    li.append(el('div', 'empty', 'Nothing here yet — the first view is coming.'));
    rail.append(li);
  }
}

// ---- Kiosk mode -------------------------------------------------------------

function renderKiosk(app: HTMLElement, catalog: Catalog, cfg: KioskConfig): void {
  measure.record('feature_kiosk');
  document.body.classList.add('kiosk');
  const stage = createStage(catalog, { autoplay: true, reducedMotion: reducedMotion() });
  app.append(stage.stageEl);

  // Minimal overlay: title + a shelf switcher, fades after idle.
  const overlay = el('div', 'kiosk-overlay');
  overlay.setAttribute('data-testid', 'kiosk-overlay');
  const title = el('span', 'kiosk-title');
  overlay.append(title, stage.creditEl);
  const switcher = el('nav', 'shelf-nav');
  for (const shelf of SHELVES) {
    const btn = el('button', 'shelf-btn', shelf.label);
    btn.type = 'button';
    btn.addEventListener('click', () => (location.search = `?kiosk=shuffle:${shelf.id}`));
    switcher.append(btn);
  }
  overlay.append(switcher);
  app.append(overlay);
  mountKioskOverlay(overlay, cfg.idleMs);

  const showAt = (scene: Scene): void => {
    title.textContent = scene.title;
    stage.show(scene);
  };

  if (cfg.mode === 'scene') {
    const scene = (cfg.sceneId && sceneById(catalog, cfg.sceneId)) || catalog.scenes[0];
    if (scene) showAt(scene);
    return;
  }
  // shuffle
  const scenes = cfg.shelf ? scenesOnShelf(catalog, cfg.shelf) : catalog.scenes;
  if (scenes.length === 0) return;
  let i = 0;
  const first = scenes[i];
  if (first) showAt(first);
  window.setInterval(() => {
    i = nextIndex(i, scenes.length);
    const scene = scenes[i];
    if (scene) showAt(scene);
  }, cfg.everyMs);
}

// ---- Bootstrap --------------------------------------------------------------

const app = document.getElementById('app');
if (!app) throw new Error('index: #app not found');
measure.record('page_home');
registerServiceWorker();

const kiosk = parseKiosk(location.search);
loadCatalog().then(
  ({ catalog, problems }) => {
    for (const p of problems) log.warn('catalog', p);
    if (kiosk) renderKiosk(app, catalog, kiosk);
    else renderApp(app, catalog);
    log.info('shell mounted', kiosk ? 'index/kiosk' : 'index');
  },
  (err) => {
    // Fail soft: still render the shell with an empty-state invitation.
    log.error('catalog load failed', err);
    const section = el('section', 'panel');
    section.append(
      el('h1', undefined, 'Put a window where there isn’t one.'),
      el('div', 'empty', 'Nothing here yet — the first view is coming.'),
    );
    mountShell(app, section);
  },
);
