import { test, expect } from '@playwright/test';

// View is a discovery portal: a third-party stream plays in place, and the
// viewer can go fullscreen on the window without leaving view.croft.ing. The
// control fullscreens the .stage (the glass frame), not the bare <video>, so
// the window aesthetic is preserved. We stub requestFullscreen (headless can't
// truly enter fullscreen) and assert the control targets the stage.
test('a playing scene exposes a fullscreen control that fullscreens the window', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __fsTargets: string[] }).__fsTargets = [];
    Element.prototype.requestFullscreen = function (this: Element) {
      (window as unknown as { __fsTargets: string[] }).__fsTargets.push(this.className);
      return Promise.resolve();
    };
  });

  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Parks' }).click();

  // Tap-to-play attaches the stream; the fullscreen control rides with it.
  await page.getByRole('button', { name: 'Open this view' }).click();
  const fs = page.getByRole('button', { name: 'Fullscreen' });
  await expect(fs).toBeVisible();
  await fs.click();

  const targets = await page.evaluate(
    () => (window as unknown as { __fsTargets: string[] }).__fsTargets,
  );
  expect(targets.some((c) => c.split(' ').includes('stage'))).toBe(true);
});
