import { test, expect } from '@playwright/test';

// Kiosk mode, driven against a hermetic fixture catalog (route-intercepted) so it
// is deterministic and needs no real media. We assert behaviour — boot-to-scene,
// overlay fade, shuffle advance, reduced-motion cut — not video playback.
const FIXTURE = {
  mediaBase: '',
  scenes: [
    { id: 'k1', shelf: 'parks', title: 'Kiosk One', kind: 'video', src: 'k1.mp4', license: 'public-domain', credit: 'NPS — public domain', creditUrl: 'https://www.nps.gov/', loop: true },
    { id: 'k2', shelf: 'parks', title: 'Kiosk Two', kind: 'video', src: 'k2.mp4', license: 'public-domain', credit: 'NPS — public domain', creditUrl: 'https://www.nps.gov/', loop: true },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route('**/scenes.json', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify(FIXTURE) }),
  );
});

test('boots straight into a named scene, full-viewport, chrome hidden', async ({ page }) => {
  await page.goto('/index.html?kiosk=k1&idle=1');
  await expect(page.locator('body')).toHaveClass(/kiosk/);
  await expect(page.locator('.kiosk .stage')).toBeVisible();
  // No normal shell chrome in kiosk mode.
  await expect(page.locator('.topbar')).toHaveCount(0);
  await expect(page.getByTestId('kiosk-overlay')).toContainText('Kiosk One');
});

test('the overlay fades after idle and returns on interaction', async ({ page }) => {
  await page.goto('/index.html?kiosk=k1&idle=1');
  const overlay = page.getByTestId('kiosk-overlay');
  await expect(overlay).toBeVisible();
  // Fades after ~1s of quiet.
  await expect(overlay).toHaveClass(/is-hidden/, { timeout: 3000 });
  // Any pointer movement brings it back.
  await page.mouse.move(20, 20);
  await page.mouse.move(60, 80);
  await expect(overlay).not.toHaveClass(/is-hidden/);
});

test('shuffle advances the shelf, cutting under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/index.html?kiosk=shuffle:parks&every=1&idle=20');
  const overlay = page.getByTestId('kiosk-overlay');
  await expect(overlay).toContainText('Kiosk One');
  // After one interval it rotates to the next scene.
  await expect(overlay).toContainText('Kiosk Two', { timeout: 4000 });
  // Reduced motion means a cut, not a crossfade: never two media layers at once.
  expect(await page.locator('.stage-media').count()).toBeLessThanOrEqual(1);
});
