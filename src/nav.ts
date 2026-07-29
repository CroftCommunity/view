// Shared shell chrome: every page calls mountShell() so the topbar, tab bar, and
// footer (build stamp · compact license line · About · Croft attribution) are
// identical across destinations. Page-per-destination, no router — navigation is
// real links between real documents (native back button).
import { VERSION } from './version';
import { currentTheme, toggleTheme } from './theme';
import { measure } from './measure/measure';
import { mountUpdateToast } from './update-toast';

/** Where the Croft mark points. View is a Croft project. */
const CROFT_HOME = 'https://croft.ing';

interface Tab {
  /** Relative href (works at a domain root or a project subpath). */
  readonly href: string;
  readonly label: string;
  /** The page basenames on which this tab is the current one. */
  readonly active: readonly string[];
}

const TABS: readonly Tab[] = [
  { href: 'index.html', label: 'View', active: ['index.html'] },
  { href: 'about.html', label: 'About', active: ['about.html'] },
  { href: 'metrics.html', label: 'Metrics', active: ['metrics.html'] },
  { href: 'settings.html', label: 'Settings', active: ['settings.html'] },
];

/** The current page's basename, treating the directory root as index.html. */
function currentPage(): string {
  const last = location.pathname.split('/').pop();
  return last && last.length > 0 ? last : 'index.html';
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

function renderTopbar(): HTMLElement {
  const bar = el('header', 'topbar');

  const wordmark = el('a', 'wordmark', 'View');
  wordmark.href = 'index.html';

  const theme = el('button', 'topbar-action');
  const paint = (): void => {
    theme.textContent = currentTheme() === 'dark' ? 'Light' : 'Dark';
    theme.setAttribute('aria-label', 'Toggle colour theme');
  };
  paint();
  theme.addEventListener('click', () => {
    toggleTheme();
    measure.record('feature_theme_toggle');
    paint();
  });

  bar.append(wordmark, theme);
  return bar;
}

function renderTabs(page: string): HTMLElement {
  const nav = el('nav', 'tabs');
  nav.setAttribute('aria-label', 'Sections');
  for (const tab of TABS) {
    const link = el('a', 'tab', tab.label);
    link.href = tab.href;
    if (tab.active.includes(page)) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
  return nav;
}

// Footer: a compact license line + About (left), the build stamp + Croft
// attribution (right). The three-shelf licensing legend in full lives on
// about.html; this is the always-present one-liner (Phase 5.2).
function renderFooter(): HTMLElement {
  const footer = el('footer', 'build-stamp');

  const left = el('div', 'footer-license');
  const about = el('a', undefined, 'About');
  about.href = 'about.html';
  left.append(
    document.createTextNode('Mine CC BY 4.0 · Parks public domain · Live © explore.org · '),
    about,
  );

  const right = el('div', 'footer-right');
  const stamp = el('span', 'mono', VERSION);
  stamp.setAttribute('data-version-stamp', '');
  const croft = el('a', 'croft-attr', 'Croft');
  croft.href = CROFT_HOME;
  croft.setAttribute('data-croft-attribution', '');
  croft.setAttribute('aria-label', 'A Croft project');
  right.append(stamp, croft);

  footer.append(left, right);
  return footer;
}

/** Render the full shell (topbar + tabs + main content + footer) into #app. */
export function mountShell(app: HTMLElement, content: HTMLElement): void {
  const main = el('main');
  main.append(content);
  app.append(renderTopbar(), renderTabs(currentPage()), main, renderFooter());
  // "Ask, don't ambush": surface a waiting worker as a transient toast.
  mountUpdateToast();
}
