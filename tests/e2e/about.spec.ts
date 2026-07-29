import { test, expect } from '@playwright/test';

test('about shows the three-shelf licensing legend, contact, and AGPL note', async ({ page }) => {
  await page.goto('/about.html');
  await expect(page.getByRole('heading', { name: 'About View', level: 1 })).toBeVisible();

  // The licensing legend (constraint C2/C4): one line per shelf.
  const legend = page.locator('.legend');
  await expect(legend).toContainText('Mine');
  await expect(legend).toContainText('CC BY 4.0');
  await expect(legend).toContainText('public domain');
  await expect(legend).toContainText('explore.org');

  // Contact for takedowns (make reaching the owner trivial).
  await expect(page.getByRole('link', { name: /chase@owasp\.org/ })).toHaveAttribute(
    'href',
    'mailto:chase@owasp.org',
  );

  // Code licence: AGPL-3.0 + repo link.
  await expect(page.getByText('AGPL-3.0')).toBeVisible();
  await expect(page.getByRole('link', { name: /github\.com\/CroftCommunity\/view/ })).toBeVisible();
});

test('every page carries the compact footer licence line + About link', async ({ page }) => {
  for (const path of ['/index.html', '/metrics.html', '/settings.html']) {
    await page.goto(path, { waitUntil: 'networkidle' });
    const footer = page.locator('.footer-license');
    await expect(footer).toContainText('Parks public domain');
    await expect(footer.getByRole('link', { name: 'About' })).toHaveAttribute('href', 'about.html');
  }
});
