import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const pages = fs
  .readdirSync('src/pages')
  .filter((file) => file.endsWith('.json') && !file.includes('.11tydata'))
  .map((file) => JSON.parse(fs.readFileSync('src/pages/' + file, 'utf8')));
test.beforeEach(async ({ context }) => {
  await context.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
});
for (const { permalink } of pages)
  test(`render ${permalink}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.url().startsWith('http://127.0.0.1:8081') && response.status() >= 400)
        errors.push(response.url());
    });
    await page.goto(permalink);
    await expect(page.locator('main')).toHaveCount(1);
    await page
      .locator('img')
      .evaluateAll((images) => images.forEach((image) => (image.loading = 'eager')));
    const broken = await page.evaluate(async () => {
      await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
      return [...document.images].filter((image) => !image.naturalWidth).map((image) => image.src);
    });
    expect(broken).toEqual([]);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  });
test('navigation closes with Escape and supports keyboard', async ({ page }, testInfo) => {
  await page.goto('/');
  const mobile = testInfo.project.name === 'mobile';
  if (mobile) {
    const toggle = page.locator('.elementor-menu-toggle');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }
  const nav = page.locator(
    mobile ? 'nav.elementor-nav-menu--dropdown' : 'nav.elementor-nav-menu--main',
  );
  const button = nav.getByRole('button', { name: 'About', exact: true });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(nav.getByRole('link', { name: 'About the Event', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(nav.getByRole('link', { name: 'About the Event', exact: true })).toBeHidden();
});
test('tabs use a single tab stop and arrows select panels', async ({ page }, testInfo) => {
  await page.goto('/local-guide/');
  const tabs = page.locator(
    testInfo.project.name === 'mobile'
      ? '.elementor-tab-mobile-title'
      : '.elementor-tab-desktop-title',
  );
  const first = tabs.first();
  await first.focus();
  await page.keyboard.press('ArrowRight');
  const selected = tabs.nth(1);
  await expect(selected).toBeFocused();
  await expect(selected).toHaveAttribute('tabindex', '0');
  await expect(first).toHaveAttribute('tabindex', testInfo.project.name === 'mobile' ? '0' : '-1');
  await expect(page.locator('#' + (await selected.getAttribute('aria-controls')))).toBeVisible();
});
test('content and navigation work without JavaScript', async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: testInfo.project.use.viewport,
  });
  await context.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8081/local-guide/');
  for (const panel of await page.locator('.elementor-tab-content').all())
    await expect(panel).toBeVisible();
  await expect(page.getByRole('link', { name: 'About the Event', exact: true })).toBeVisible();
  await expect(page.locator('.skip-link')).toHaveCount(1);
  await context.close();
});
test('gallery and accordion retain interaction', async ({ page }) => {
  await page.goto('/conference-venue-and-hotel/');
  await page.locator('a[data-elementor-open-lightbox="yes"]').first().click();
  await expect(page.locator('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).toHaveCount(0);
  await page.goto('/sponsorship/');
  const title = page.locator('.elementor-accordion .elementor-tab-title').first();
  const panel = page.locator('#' + (await title.getAttribute('aria-controls')));
  await title.click();
  await expect(panel).toBeHidden();
  await title.click();
  await expect(panel).toBeVisible();
});
for (const route of ['/', '/local-guide/'])
  test(`accessibility semantics ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withRules([
        'aria-valid-attr',
        'aria-valid-attr-value',
        'aria-required-attr',
        'aria-required-children',
        'aria-required-parent',
        'button-name',
        'link-name',
        'image-alt',
        'landmark-one-main',
        'duplicate-id-aria',
      ])
      .analyze();
    expect(
      results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  });
