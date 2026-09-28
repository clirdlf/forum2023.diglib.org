import { test, expect } from '@playwright/test';
test.skip(!process.env.VISUAL_TEST, 'Optional visual baseline check; run pnpm test:visual.');
for (const route of ['/', '/local-guide/'])
  test(`visual ${route}`, async ({ page }) => {
    await page.route('**/*', (route) =>
      new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
    );
    await page.goto(route);
    await page
      .locator('img')
      .evaluateAll((images) => images.forEach((image) => (image.loading = 'eager')));
    await page.evaluate(() =>
      Promise.all([...document.images].map((image) => image.decode().catch(() => {}))),
    );
    await expect(page).toHaveScreenshot(route === '/' ? 'home.png' : 'local-guide.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.005,
    });
  });
