import { test, expect } from '@playwright/test';

test('settings shows an Update control, kiosk launchers, and the Croft attribution', async ({ page }) => {
  await page.goto('/settings.html');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();

  // Update control (the explicit half of "ask, don't ambush"). SW blocked in the
  // hermetic gate, so no update is waiting → it reads idle.
  const update = page.getByTestId('update-button');
  await expect(update).toBeVisible();
  await expect(update).toHaveText(/Check for updates|Update available/);

  // Kiosk launchers, one per shelf.
  await expect(page.getByTestId('kiosk-launch-parks')).toHaveAttribute(
    'href',
    'index.html?kiosk=shuffle:parks',
  );

  // About + Croft attribution in the footer.
  await expect(page.locator('[data-croft-attribution]').first()).toHaveAttribute(
    'href',
    'https://croft.ing',
  );
});
