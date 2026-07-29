// Offline page entry — the SW's last-resort fallback for a navigation that can't
// reach the network and has no cached match. Keeps the voice.
import { mountShell } from '../nav';
import { log } from '../log';

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

function content(): HTMLElement {
  const section = el('section', 'panel');
  section.append(
    el('h1', undefined, 'No view without a sky'),
    el('p', undefined, 'You’re offline. Reconnect and the window opens again.'),
    (() => {
      const empty = el('div', 'empty');
      const home = el('a', undefined, 'Back to the window');
      home.href = 'index.html';
      empty.append(home);
      return empty;
    })(),
  );
  return section;
}

const app = document.getElementById('app');
if (!app) throw new Error('offline: #app not found');
mountShell(app, content());
log.info('shell mounted', 'offline');
