import { test, expect } from '@playwright/test';

// The PWA mechanics need the real service worker, so re-enable it here (the rest
// of the gate blocks SWs because they bypass route mocks). We prove: the worker
// registers and controls the page, the shell survives offline, and media/ is
// never cached (video is huge; R2 egress is free — it must pass through).
test.use({ serviceWorkers: 'allow' });

test('service worker registers and controls the page', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  const controlled = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.controller !== null;
  });
  expect(controlled).toBe(true);
});

test('the shell (and catalog) survive offline via the precache', async ({ page, context }) => {
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  // Network-first navigation falls back to the cached shell; scenes.json is
  // precached, so the app still paints.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('stage')).toBeVisible();
  await context.setOffline(false);
});

test('media/ is never placed in the cache', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cachedMedia = await page.evaluate(async () => {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) {
        if (/\/media\//.test(new URL(req.url).pathname)) return true;
      }
    }
    return false;
  });
  expect(cachedMedia).toBe(false);
});
