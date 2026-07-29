// Metrics page entry — the live surface of View's telemetry posture (adopted
// verbatim from croft-pwa's counter-based, privacy-preserving design). It shows:
// the registry with plain-language disclosures, the current LOCAL counts, recent
// LOCAL-only events (never transmitted), the exact wire payload a flush WOULD
// send, and an opt-in sharing toggle (default off) + a visible flush button.
import { mountShell } from '../nav';
import { registerServiceWorker } from '../sw-register';
import { log } from '../log';
import { measure } from '../measure/measure';
import { METRICS } from '../measure/registry';
import { getConsent, setConsent } from '../measure/consent';

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

function disclosurePanel(): HTMLElement {
  const panel = el('section', 'panel');
  panel.append(
    el('h2', undefined, 'What could be measured'),
    el(
      'p',
      undefined,
      'Counting is local and always visible below; nothing leaves this device unless ' +
        'you turn sharing on. Each metric is a plain counter with a stated purpose and ' +
        'an expiry after which it stops on its own.',
    ),
  );
  const list = el('ul', 'measure-list');
  for (const [name, meta] of METRICS) {
    const li = el('li');
    li.append(
      el('span', 'mono', name),
      document.createTextNode(` — ${meta.disclosure} (until ${meta.expires})`),
    );
    list.append(li);
  }
  panel.append(list);
  return panel;
}

function countsPanel(): HTMLElement {
  const panel = el('section', 'panel');
  panel.append(el('h2', undefined, 'Your local counts'));
  const snap = measure.snapshot();
  const list = el('ul', 'measure-list');
  const entries = Object.entries(snap.counts);
  if (entries.length === 0) {
    list.append(el('li', undefined, 'No counts yet on this device.'));
  } else {
    for (const [name, n] of entries) {
      const li = el('li');
      li.append(el('span', 'mono', name), document.createTextNode(` — ${n}`));
      list.append(li);
    }
  }
  panel.append(list);
  return panel;
}

function wirePanel(): HTMLElement {
  const panel = el('section', 'panel');
  panel.append(
    el('h2', undefined, 'What a flush would send'),
    el(
      'p',
      undefined,
      'The complete shape that could leave the device: a coarse month and an ' +
        'unordered bag of counter → integer. No identity, no ordering, no fine ' +
        'timestamps — the serialiser cannot read them.',
    ),
  );
  const { payload, problems } = measure.wirePreview();
  const pre = el('pre');
  pre.setAttribute('data-testid', 'wire-preview');
  pre.append(el('code', undefined, JSON.stringify(payload, null, 2)));
  panel.append(pre);
  if (problems.length > 0) {
    panel.append(el('p', 'mono', `schema problems: ${problems.join('; ')}`));
  }

  // Consent (opt-in) + a visible flush.
  const consent = el('button', 'btn btn-secondary');
  consent.setAttribute('data-testid', 'consent-toggle');
  const paintConsent = (): void => {
    consent.textContent = getConsent() ? 'Sharing: on (tap to turn off)' : 'Sharing: off (tap to turn on)';
    consent.setAttribute('aria-pressed', String(getConsent()));
  };
  paintConsent();
  consent.addEventListener('click', () => {
    setConsent(!getConsent());
    paintConsent();
  });

  const flush = el('button', 'btn btn-primary');
  flush.setAttribute('data-testid', 'flush-now');
  flush.textContent = 'Flush now (logs to console)';
  const flushResult = el('p', 'mono');
  flush.addEventListener('click', () => {
    const last = measure.flushNow();
    flushResult.textContent = last.transmitted
      ? 'Logged as if sent (no remote is configured).'
      : 'Sharing is off — nothing sent; the payload above was logged.';
  });

  const controls = el('div', 'shelf-nav');
  controls.append(consent, flush);
  panel.append(controls, flushResult);
  return panel;
}

function content(): HTMLElement {
  const wrap = el('div');
  const intro = el('section', 'panel');
  intro.append(
    el('h1', undefined, 'Metrics'),
    el('p', undefined, 'Honest product signal without surveillance. Local by default; sharing is opt-in.'),
  );
  wrap.append(intro, disclosurePanel(), countsPanel(), wirePanel());
  return wrap;
}

const app = document.getElementById('app');
if (!app) throw new Error('metrics: #app not found');
measure.record('page_metrics');
mountShell(app, content());
registerServiceWorker();
log.info('shell mounted', 'metrics');
