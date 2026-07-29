import { test, expect } from '@playwright/test';

// Graceful degradation (DEPLOY.md: "windows show a poster … until their media
// exists"). When a scene's stream can't load — offline, 404, decode error, or a
// third-party origin that's down — the stage must fall back to the calm CSS
// poster instead of leaving an empty, broken <video> box. We force the failure
// hermetically by aborting the video request, so the test never depends on the
// network or on a particular scene being broken.
test('a video whose stream fails degrades to the poster, not an empty box', async ({ page }) => {
  await page.route(/\.mp4(\?|$)/, (route) => route.abort());

  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Parks' }).click();
  const play = page.getByRole('button', { name: 'Open this view' });
  await expect(play).toBeVisible();
  await play.click();

  // The aborted request fires the <video> error event; the active media layer
  // must recover to the poster placeholder and drop the dead <video>. Scope to
  // the last layer so a crossfade's outgoing layer isn't matched.
  const media = page.getByTestId('stage').locator('.stage-media').last();
  await expect(media.locator('.stage-poster')).toBeVisible();
  await expect(media.locator('video')).toHaveCount(0);
});
