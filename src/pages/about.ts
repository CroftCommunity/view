// About page entry — what View is, the three-shelf licensing legend (constraint
// C2/C4), a contact link (explore.org's takedown process tries to reach creators
// first, so make that trivial), and the code-license note (AGPL-3.0 + repo link).
import { mountShell } from '../nav';
import { registerServiceWorker } from '../sw-register';
import { log } from '../log';
import { measure } from '../measure/measure';

const REPO = 'https://github.com/CroftCommunity/view';
const CONTACT = 'mailto:chase@owasp.org';

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

function link(text: string, href: string): HTMLAnchorElement {
  const a = el('a', undefined, text);
  a.href = href;
  if (/^https?:/.test(href)) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  return a;
}

function legendItem(shelf: string, body: (p: HTMLParagraphElement) => void): HTMLLIElement {
  const li = el('li');
  const p = el('p');
  p.append(el('span', 'legend-shelf', shelf));
  body(p);
  li.append(p);
  return li;
}

function content(): HTMLElement {
  const wrap = el('div');

  const intro = el('section', 'panel');
  intro.append(
    el('h1', undefined, 'About View'),
    (() => {
      const p = el('p');
      p.append(
        document.createTextNode(
          'View is a window from another point of view: ambient scenery for any ' +
            'screen, kiosk-friendly for a wall display. It is a discovery portal — ' +
            'it plays real footage from a few carefully-licensed sources in place, ' +
            'and shows the licence for every scene, on the scene. View has no ' +
            'accounts, adds no ads, and tracks nothing; a live cam is embedded ' +
            'through the source’s own player (explore.org publishes on YouTube), ' +
            'which may carry that source’s ads.',
        ),
      );
      return p;
    })(),
  );

  const legend = el('section', 'panel');
  legend.append(el('h2', undefined, 'Licensing legend'));
  const list = el('ul', 'legend');
  list.append(
    legendItem('Mine', (p) =>
      p.append(document.createTextNode('Personal clips — CC BY 4.0. © the owner, credited per scene.')),
    ),
    legendItem('Parks', (p) => {
      p.append(
        document.createTextNode('US public domain — e.g. the '),
        link('National Park Service B-Roll archive', 'https://www.nps.gov/grca/learn/photosmultimedia/b-roll_hd_index.htm'),
        document.createTextNode(
          '. Free to use; no endorsement is implied and no NPS arrowhead logo appears anywhere in this app.',
        ),
      );
    }),
    legendItem('Live', (p) => {
      p.append(
        document.createTextNode('Footage © '),
        link('explore.org', 'https://explore.org'),
        document.createTextNode(
          ', shown per their published guidelines: we embed the cam’s own live ' +
            'player in place and credit explore.org, rather than recording or ' +
            're-hosting the footage.',
        ),
      );
    }),
  );
  legend.append(list);

  const contact = el('section', 'panel');
  contact.append(
    el('h2', undefined, 'Contact & takedowns'),
    (() => {
      const p = el('p');
      p.append(
        document.createTextNode(
          'If you are a creator or rights-holder and want a scene changed or removed, ' +
            'reach us first — we would rather fix it directly than through a platform. ',
        ),
        link('chase@owasp.org', CONTACT),
        document.createTextNode('.'),
      );
      return p;
    })(),
  );

  const code = el('section', 'panel');
  code.append(
    el('h2', undefined, 'The code'),
    (() => {
      const p = el('p');
      p.append(
        document.createTextNode('View’s site code is licensed '),
        el('strong', undefined, 'AGPL-3.0'),
        document.createTextNode('. Scene content licences are separate and per-shelf (above). Source: '),
        link('github.com/CroftCommunity/view', REPO),
        document.createTextNode('.'),
      );
      return p;
    })(),
  );

  wrap.append(intro, legend, contact, code);
  return wrap;
}

const app = document.getElementById('app');
if (!app) throw new Error('about: #app not found');
measure.record('page_about');
mountShell(app, content());
registerServiceWorker();
log.info('shell mounted', 'about');
