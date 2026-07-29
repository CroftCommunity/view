import { test, expect } from '@playwright/test';

// Live cams embed the source's player in place (portal model). explore.org only
// offers YouTube, so a Live scene is a YouTube <iframe>. It is tap-to-play, so a
// page never loads a YouTube iframe until the viewer asks — then a fullscreen
// control lets them fill the screen without leaving view.croft.ing.
test('a Live cam embeds a YouTube iframe in place, with a fullscreen control', async ({ page }) => {
  await page.goto('/index.html');

  // Default shelf is Live: tap-to-play, not an external link.
  const play = page.getByRole('button', { name: 'Open this view' });
  await expect(play).toBeVisible();
  await expect(page.getByRole('link', { name: /Watch live/ })).toHaveCount(0);
  await play.click();

  const stage = page.getByTestId('stage');
  await expect(stage.locator('iframe[src*="youtube.com/embed/"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Fullscreen' })).toBeVisible();
});
