import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

const SW = fileURLToPath(new URL('../../dist/sw.js', import.meta.url));
const SUMMARY = '.summary .stat-hero .stat-value';
const CHART = '.temperature-chart > .chart-plot svg';

const drawn = async (page: Page) => {
  await expect(page.locator('main[data-ready]')).toBeAttached({ timeout: 60_000 });
  await expect(page.locator(SUMMARY)).toBeVisible();
  await expect(page.locator(CHART).first()).toBeVisible();
};

/** Opens the site on a first visit and waits until its worker has cached it and runs the page. */
const firstVisit = async (page: Page) => {
  await page.goto('/');
  await drawn(page);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
    timeout: 60_000,
  });
};

test.describe('offline', () => {
  test.slow();

  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => localStorage.setItem('planetshift.tour', 'seen'));
  });

  test('Explore opens again offline after one visit, from nowhere but the site', async ({
    page,
    context,
    baseURL,
  }) => {
    const elsewhere: string[] = [];
    context.on('request', (r) => {
      if (!r.url().startsWith(baseURL ?? '') && !r.url().startsWith('data:')) {
        elsewhere.push(r.url());
      }
    });
    await firstVisit(page);
    await context.setOffline(true);
    await page.reload();
    await drawn(page);
    expect(elsewhere).toEqual([]);
  });

  test('the French pages and the Methodology open offline', async ({ page, context }) => {
    await firstVisit(page);
    await context.setOffline(true);
    await page.goto('/fr/');
    await drawn(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await page.reload();
    await drawn(page);
    await page.goto('/fr/methodology/');
    await expect(page.locator('.method-section').first()).toBeVisible();
    await expect(page.locator('main[data-ready]')).toBeAttached({ timeout: 60_000 });
    await page.goto('/methodology/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.method-section').first()).toBeVisible();
  });

  test("a new build's worker waits until the reader reloads", async ({ page }, testInfo) => {
    // It rewrites the served sw.js, so one project runs it, not two side by side.
    test.skip(testInfo.project.name !== 'desktop');
    await firstVisit(page);
    const reload = page.locator('.update-prompt').getByRole('button', { name: 'Reload' });
    await expect(reload).toBeHidden();
    const original = readFileSync(SW);
    writeFileSync(SW, Buffer.concat([original, Buffer.from('\n// the next build\n')]));
    try {
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
      await expect(reload).toBeVisible({ timeout: 30_000 });
      await expect(page.locator(SUMMARY)).toBeVisible();
      await Promise.all([page.waitForEvent('load'), reload.click()]);
      await drawn(page);
      await expect(reload).toBeHidden();
    } finally {
      writeFileSync(SW, original);
    }
  });
});
