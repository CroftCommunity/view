import { test, expect } from '@playwright/test';

// Mobile-first, tap-first: nothing may overflow horizontally on a phone. Guard
// the three narrow widths (320/360/390) after any layout change.
for (const width of [320, 360, 390]) {
  for (const path of ['/index.html', '/about.html', '/settings.html', '/metrics.html', '/offline.html']) {
    test(`no horizontal overflow: ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);
    });
  }
}
