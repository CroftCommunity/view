import { test, expect } from '@playwright/test';

test('home renders the window shell, wordmark, and build stamp', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.getByRole('heading', { name: /Put a window/, level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View', exact: true }).first()).toBeVisible();
  await expect(page.locator('[data-version-stamp]').first()).toBeVisible();
  await expect(page.getByTestId('stage')).toBeVisible();
});

test('tabs navigate to settings (real link, real document)', async ({ page }) => {
  await page.goto('/index.html');
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/settings\.html$/);
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
});

test('theme toggle flips the document theme', async ({ page }) => {
  await page.goto('/index.html');
  const html = page.locator('html');
  await expect(page.getByRole('button', { name: 'Toggle colour theme' })).toBeVisible();
  const before = await html.getAttribute('data-theme');
  await page.getByRole('button', { name: 'Toggle colour theme' }).click();
  const after = await html.getAttribute('data-theme');
  expect(after).not.toBe(before);
  expect(['light', 'dark']).toContain(after);
});

test('shelves switch, and each scene renders its licence credit (C2)', async ({ page }) => {
  await page.goto('/index.html');

  // Default shelf is Live — a link card with the explore.org credit.
  const credit = page.getByTestId('credit');
  await expect(credit).toContainText(/explore\.org/);
  await expect(page.getByRole('link', { name: /Watch live at explore\.org/ }).first()).toBeVisible();

  // Switch to Parks: public-domain credit + a tap-to-play window (no eager load).
  await page.getByRole('button', { name: 'Parks' }).click();
  await expect(page.getByRole('button', { name: 'Parks' })).toHaveAttribute('aria-pressed', 'true');
  await expect(credit).toContainText('Public domain');
  await expect(page.getByRole('button', { name: 'Open this view' })).toBeVisible();
});
