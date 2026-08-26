import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Automated accessibility scan. Every page, both themes (contrast is
// theme-dependent), must have zero serious/critical axe violations.
//
// HERMETIC by construction: all cross-origin requests are blocked, so every page
// renders the same offline shell on a networked laptop as in CI. Without this the
// scan grades a DOM that varies by runner. Rule + incident:
// CroftC/.claude/ACCESSIBILITY.md § "Three soundness requirements".
const PAGES = ['/index.html', '/about.html', '/metrics.html', '/settings.html', '/offline.html'];

for (const path of PAGES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`a11y: ${path} (${theme}) — no serious/critical violations`, async ({ page }) => {
      await page.addInitScript((t) => {
        try {
          localStorage.setItem('croft-theme', t);
        } catch {
          /* private mode — theme still applies for the session */
        }
      }, theme);
      await page.route('**/*', (route) => {
        const host = new URL(route.request().url()).hostname;
        if (host === 'localhost' || host === '127.0.0.1') void route.continue();
        else void route.abort();
      });
      await page.goto(path, { waitUntil: 'networkidle' });

      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id} (${v.impact ?? '?'}) × ${v.nodes.length}`);

      expect(blocking, blocking.join(' · ')).toEqual([]);
    });
  }
}
