import { strFromU8, unzipSync } from 'fflate';
import { expect, test, type Page } from '@playwright/test';

const START = '/?data=fixtures';
const OPTIONS: Record<string, string[]> = {
  scope: ['cradleToFarmGate', 'farmGate'],
  feed: ['species', 'gleam'],
  baseline: ['population', 'ssp2'],
  location: ['fixedTrade', 'domestic'],
  temperature: ['hadcrut5', 'berkeley'],
  climate: ['fair', 'ar6'],
  ssp: ['ssp245', 'ssp126', 'ssp370'],
  regrowth: ['none', 'natural'],
  deadfall: ['off', 'on'],
  dataCentres: ['iea', 'ssp'],
  permafrost: ['on', 'off'],
  population: ['medium', 'low', 'high'],
};

const FONT_HOSTS = /fonts\.(googleapis|gstatic)\.com/;
let errors: string[] = [];

const TOUR = '@tour';
const CLOSED_PANEL = '@closedPanel';

test.beforeEach(async ({ page }, testInfo) => {
  errors = [];
  // The guided start opens on a first visit; every test but its own starts as a returning reader.
  if (!testInfo.tags.includes(TOUR)) {
    await page.context().addInitScript(() => localStorage.setItem('planetshift.tour', 'seen'));
  }
  // The panel opens collapsed on a phone; every test but its own starts with it opened.
  if (!testInfo.tags.includes(CLOSED_PANEL)) {
    await page.context().addInitScript(() => {
      if (localStorage.getItem('planetshift.menu.panel') === null) {
        localStorage.setItem('planetshift.menu.panel', 'open');
      }
    });
  }
  // The Lato font comes from Google Fonts with display=swap: offline, the page falls back to the
  // system font, so a failed font request is not an error of the app.
  page.on('console', (m) => {
    if (m.type() === 'error' && !FONT_HOSTS.test(m.location().url)) {
      errors.push(m.text());
    }
  });
  page.on('pageerror', (e) => errors.push(e.message));
});

test.afterEach(() => {
  expect(errors, 'console errors').toEqual([]);
});

/** Opens a page once the app, not the pre-rendered snapshot it replaces, has drawn a result. */
const open = async (page: Page, url = START) => {
  await page.goto(url);
  await expect(page.locator('main[data-ready]')).toBeAttached();
  await expect(page.locator('.summary .stat-hero .stat-value')).toBeVisible();
};

/** Opens the Diet group, closed at first like every group, to reach its controls. */
const openDiet = async (page: Page) => {
  const diet = page.locator('details[data-group="diet"]');
  if ((await diet.getAttribute('open')) === null) {
    await diet.locator('> summary').click();
  }
};

const summaryText = async (page: Page) =>
  (await page.locator('.summary > :not([role="status"])').allInnerTexts()).join('\n');
const chartMarkup = (page: Page) =>
  page.locator('.temperature-chart > .chart-plot svg').innerHTML();
const visibleState = async (page: Page) =>
  [await summaryText(page), await chartMarkup(page)].join('|');

const lastY = async (page: Page, selector: string) => {
  const d = (await page.locator(selector).getAttribute('d')) ?? '';
  const numbers = d.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? [];
  return Number(numbers.at(-1));
};

const noHorizontalScroll = async (page: Page) =>
  expect(
    // A mobile browser widens its layout viewport to fit overflowing content, so innerWidth
    // alone would hide the overflow; the screen width does not move.
    await page.evaluate(
      () => document.documentElement.scrollWidth - Math.min(window.innerWidth, screen.width),
    ),
  ).toBeLessThanOrEqual(0);

test('draws a path for every fixture country', async ({ page, request }) => {
  const countries = (await (await request.get('/fixtures/countries.json')).json()) as {
    iso3: string;
  }[];
  await open(page);
  for (const c of countries) {
    await expect(page.locator(`path.country[data-iso3="${c.iso3}"]`)).toHaveCount(1);
  }
  await expect(page.locator('path.country.has-data')).toHaveCount(countries.length);
});

test('the shift slider moves the scenario line below the baseline', async ({ page }) => {
  await open(page);
  await openDiet(page);
  await page.locator('#shift').fill('50');
  await expect(page).toHaveURL(/shift=50/);
  await expect(page.locator('.gap-annotation text')).toContainText('−');
  const [scenario, baseline] = [
    await lastY(page, '.temperature-chart .scenario-line'),
    await lastY(page, '.temperature-chart .baseline-line'),
  ];
  expect(scenario).toBeGreaterThan(baseline);
  await expect(page.locator('button.preset')).toHaveCount(0);
});

test('every option switch works both ways', async ({ page }) => {
  // The feed split only matters when the animal groups change by different shares.
  await open(page, `${START}&shift=20&rum=60`);
  await page.locator('#panel-tab-options').click();
  for (const [key, values] of Object.entries(OPTIONS)) {
    const [first, ...alternatives] = values;
    for (const value of alternatives) {
      const [url, visible] = [page.url(), await visibleState(page)];
      await page.locator(`label[for="option-${key}-${value}"]`).click();
      await expect(page.locator(`#option-${key}-${value}`)).toBeChecked();
      await expect.poll(() => page.url()).not.toBe(url);
      await expect.poll(() => visibleState(page)).not.toBe(visible);
      await page.locator(`label[for="option-${key}-${first}"]`).click();
      await expect(page.locator(`#option-${key}-${first}`)).toBeChecked();
      await expect.poll(() => page.url()).toBe(url);
      await expect.poll(() => visibleState(page)).toBe(visible);
    }
  }
});

test('a shared URL restores the state', async ({ page, browser }) => {
  await open(page);
  await openDiet(page);
  await page.locator('details[data-fold="advanced"] > summary').click();
  await page.locator('#group-ruminantMeat').fill('50');
  await page.locator('label[for="basis-kcal"]').click();
  await page.locator('#panel-tab-options').click();
  await page.locator('label[for="option-ssp-ssp126"]').click();
  await page.locator('label[for="layer-change"]').click();
  await expect.poll(() => page.url()).toContain('ssp=ssp126');
  const [url, summary] = [page.url(), await summaryText(page)];
  const other = await browser.newPage();
  await other.goto(url);
  await expect(other.locator('main[data-ready]')).toBeAttached();
  await expect(other.locator('#basis-kcal')).toBeChecked();
  await expect(other.locator('#option-ssp-ssp126')).toBeChecked();
  await expect(other.locator('#layer-change')).toBeChecked();
  await expect(other.locator('#group-ruminantMeat')).toHaveValue('50');
  expect(await summaryText(other)).toBe(summary);
  await other.close();
});

test('switches to French', async ({ page }) => {
  await open(page);
  await page.locator('button[data-lang="fr"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('.site-nav a[data-view="explore"]')).toHaveText('Explorer');
  await expect(page.locator('.tagline')).toHaveText('À quoi ressemble le changement ?');
  await expect(page.locator('.summary')).toContainText('Réchauffement évité en 2050');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

test('toggles the theme and keeps it', async ({ page }) => {
  await open(page);
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const before = await background();
  await page.locator('.theme-toggle').click();
  const theme = await page.locator('html').getAttribute('data-theme');
  expect(theme === 'dark' || theme === 'light').toBe(true);
  await expect.poll(background).not.toBe(before);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme ?? '');
});

test('Causes of warming shows the stacked warming chart', async ({ page }) => {
  await open(page);
  await expect(page.locator('.site-nav a')).toHaveCount(2);
  await page.locator('#chart-tab-cause').click();
  await expect(page).toHaveURL(/chart=cause/);
  await expect(page.locator('#chart-panel-cause')).toBeVisible();
  await expect(page.locator('#chart-panel-temperature')).toBeHidden();
  await expect(page.locator('.attribution-chart path.stack')).toHaveCount(7);
  await expect(page.locator('.attribution-chart .observed-line')).toHaveCount(1);
  await expect(page.locator('.attribution-chart .chart-legend')).toContainText(
    'Air pollution (cooling)',
  );
  await expect(page.locator('.attribution-chart .chart-legend')).toContainText(
    'Natural factors (sun and volcanoes)',
  );
  await expect(page.locator('.attribution-chart .stack-outline')).toHaveCount(0);
  await expect(page.locator('.gas-chart')).toHaveCount(0);
  await noHorizontalScroll(page);
});

test('the gas switch stacks one gas by cause, kept in the URL and moved by the keyboard', async ({
  page,
}) => {
  await open(page, `${START}&chart=cause`);
  const legend = page.locator('.attribution-chart .chart-legend');
  const gasSwitch = page.locator('[data-control="causegas"]');
  await expect(gasSwitch).toBeVisible();
  await expect(page.locator('#causegas-all')).toBeChecked();
  await expect(gasSwitch).toContainText('Methane');
  await page.locator('label[for="causegas-ch4"]').click();
  await expect(page).toHaveURL(/causegas=ch4/);
  await expect(page.locator('.attribution-chart path.stack')).toHaveCount(4);
  await expect(page.locator('.attribution-chart .observed-line')).toHaveCount(0);
  await expect(legend).toContainText('Interactions and other minor sources');
  await expect(legend).not.toContainText('Air pollution');
  await expect(legend).not.toContainText('Land use');
  await expect(page.locator('.attribution-chart svg[role="img"]')).toHaveAttribute(
    'aria-label',
    /methane/,
  );
  await noHorizontalScroll(page);

  await page.locator('#causegas-ch4').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/causegas=n2o/);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/causegas=co2/);
  await expect(page.locator('.attribution-chart path.stack')).toHaveCount(5);
  await expect(legend).toContainText('Land use');

  await page.reload();
  await expect(page.locator('#causegas-co2')).toBeChecked();
  await expect(page.locator('.attribution-chart path.stack')).toHaveCount(5);
});

test('a lever shrinks its cause in the gas it cuts, with and without in the hover', async ({
  page,
}) => {
  await open(page, `${START}&chart=cause&causegas=co2&to=2100`);
  const band = () =>
    page.locator('.attribution-chart path.stack[data-cause="fossilIndustry"]').getAttribute('d');
  const before = await band();
  const fold = page.locator('details[data-group="levers-energy"]');
  await fold.locator('summary').click();
  await page.locator('#lever-renewableElectricity').fill('100');
  await expect(page).toHaveURL(/re=100/);
  await expect.poll(band).not.toBe(before);
  await expect(page.locator('.attribution-chart .stack-outline').first()).toBeAttached();
  const target = page.locator('.attribution-chart .hover-target');
  const box = await target.boundingBox();
  await target.hover({ position: { x: (box?.width ?? 0) * 0.95, y: (box?.height ?? 0) / 2 } });
  await expect(page.locator('.attribution-chart .chart-tooltip')).toContainText(
    'without the levers',
  );
});

test('a French reader gets the gas switch in French', async ({ page }) => {
  await open(page, `${START}&chart=cause&causegas=ch4&lang=fr`);
  await expect(page.locator('[data-control="causegas"]')).toContainText('Tous les gaz');
  await expect(page.locator('.attribution-chart .chart-legend')).toContainText(
    'Interactions et autres sources mineures',
  );
});

test('the causes chart shrinks the band of the cause a lever acts on', async ({ page }) => {
  await open(page, `${START}&chart=cause`);
  const band = (cause: string) =>
    page.locator(`.attribution-chart path.stack[data-cause="${cause}"]`).getAttribute('d');
  const fossil = await band('fossilIndustry');
  const fold = page.locator('details[data-group="levers-energy"]');
  await fold.locator('summary').click();
  await page.locator('#lever-renewableElectricity').fill('100');
  await expect(page).toHaveURL(/re=100/);
  await expect.poll(() => band('fossilIndustry')).not.toBe(fossil);
  await expect(page.locator('.attribution-chart .stack-outline').first()).toBeAttached();
  await expect(page.locator('.attribution-chart .chart-legend')).toContainText(
    'Without the levers',
  );
  await expect(page.locator('.headline-sub')).toContainText('Fossil fuels and industry');
});

test('the link under the temperature chart opens the causes of warming', async ({ page }) => {
  await open(page);
  const link = page.locator('#chart-panel-temperature .see-causes');
  await expect(link).toHaveText('See what causes the warming');
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/chart=cause/);
  await expect(page.locator('#chart-tab-cause')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#chart-panel-cause')).toBeVisible();
  await expect(page.locator('#chart-panel-temperature')).toBeHidden();
});

test('an old link to The link opens Explore on the chart by cause', async ({ page }) => {
  await open(page, `${START}&view=link`);
  await expect(page).toHaveURL(/chart=cause/);
  await expect(page).not.toHaveURL(/view=/);
  await expect(page.locator('.site-nav a[data-view="explore"]')).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('#chart-tab-cause')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.attribution-chart path.stack')).toHaveCount(7);
});

test('Methodology renders its sections with a table of contents', async ({ page }) => {
  await open(page);
  await page.locator('.site-nav a[data-view="methodology"]').click();
  const sections = page.locator('.method-section');
  await expect(sections.first()).toBeVisible();
  const count = await sections.count();
  expect(count).toBeGreaterThanOrEqual(2);
  await expect(page.locator('.toc-item > a')).toHaveCount(count);
  await expect(sections.first()).toHaveAttribute('data-section', 'overview');
  if (await page.locator('.toc-toggle').isVisible()) {
    await page.locator('.toc-toggle').click();
  }
  await page.locator('.toc-item > a').last().click();
  await expect(page).toHaveURL(/#method-/);
  await noHorizontalScroll(page);
});

test('a link to a Methodology section opens on its heading, below the header', async ({ page }) => {
  await page.goto(`${START}&view=methodology#method-climate`);
  const heading = page.locator('#method-climate > :first-child');
  await expect(heading).toBeInViewport();
  const below = async () => {
    const header = await page.locator('.site-header').boundingBox();
    const bar = await page.locator('.toc-toggle').boundingBox();
    return Math.max(header!.y + header!.height, bar && bar.height ? bar.y + bar.height : 0);
  };
  await expect
    .poll(async () => (await heading.boundingBox())!.y)
    .toBeGreaterThanOrEqual(await below());
  await page.locator('.site-nav a[data-view="explore"]').click();
  await page.locator('.site-nav a[data-view="methodology"]').click();
  if (await page.locator('.toc-toggle').isVisible()) {
    await page.locator('.toc-toggle').click();
  }
  await page.locator('.toc-item > a[href="#method-options"]').click();
  await expect(page).toHaveURL(/view=methodology&data=fixtures#method-options$/);
  const options = page.locator('#method-options > :first-child');
  await expect(options).toBeInViewport();
  expect((await options.boundingBox())!.y).toBeGreaterThanOrEqual(await below());
  await page.goBack();
  await expect(page).toHaveURL(/view=methodology&data=fixtures$/);
  await expect(page.locator('.methodology')).toBeVisible();
});

test('on a phone the contents open from a bar, reach the last link and close on it', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'the contents bar is for phones');
  await open(page);
  await page.locator('.site-nav a[data-view="methodology"]').click();
  const toggle = page.locator('.toc-toggle');
  const last = page.locator('.toc-item > a').last();
  await expect(last).toBeHidden();
  await page.mouse.wheel(0, 3000);
  await expect(toggle).toBeInViewport();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  const id = (await last.getAttribute('href'))!.slice(1);
  await last.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page).toHaveURL(new RegExp(`#${id}$`));
  const heading = page.locator(`#${id} > :first-child`);
  await expect(heading).toBeInViewport();
  const bar = await toggle.boundingBox();
  expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height);
});

test('the map layers and tooltip work', async ({ page }) => {
  await open(page);
  for (const layer of [
    'production',
    'emissions',
    'land',
    'deforestation',
    'landCo2',
    'mammals',
    'species',
    'water',
    'waterScarcity',
    'waste',
    'quality',
    'change',
    'emissions',
  ]) {
    await page.locator(`label[for="layer-${layer}"]`).click();
    await expect(page).toHaveURL(
      layer === 'emissions' ? /^(?!.*layer=)/ : new RegExp(`layer=${layer}`),
    );
    await expect(page.locator('.legend li').first()).toBeVisible();
  }
  await page.locator('path.country.has-data').first().click();
  await expect(page.locator('.map-frame .tooltip')).toBeVisible();
  await expect(page.locator('.map-frame .tooltip')).toContainText('Least precise source');
});

test('a tap pins the map tooltip inside the frame and a tap outside dismisses it', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'touch only');
  await open(page);
  const tooltip = page.locator('.map-frame .tooltip');
  for (const country of await page.locator('path.country.has-data').all()) {
    if (!(await country.isVisible())) {
      continue;
    }
    await country.tap();
    await expect(tooltip).toBeVisible();
    const [tip, frame] = [
      await tooltip.boundingBox(),
      await page.locator('.map-frame').boundingBox(),
    ];
    expect(
      tip && frame && tip.x >= frame.x - 1 && tip.x + tip.width <= frame.x + frame.width + 1,
    ).toBe(true);
    await page.locator('.summary').tap();
    await expect(tooltip).toBeHidden();
  }
  const chart = page.locator('.temperature-chart > .chart-plot');
  await chart.locator('.hover-target').tap();
  await expect(chart.locator('.chart-tooltip')).toBeVisible();
  await page.locator('.summary').tap();
  await expect(chart.locator('.chart-tooltip')).toBeHidden();
});

test('no horizontal scroll on Explore', async ({ page }) => {
  await open(page);
  await noHorizontalScroll(page);
});

test(
  'the guided start opens once, steps with the keyboard and closes',
  { tag: TOUR },
  async ({ page }) => {
    await open(page);
    const tour = page.getByRole('dialog', { name: 'Guided start' });
    await expect(tour).toBeVisible();
    await expect(tour.locator('.tour-progress')).toHaveText('Step 1 of 3');
    await expect(tour.getByRole('heading')).toHaveText('What the chart shows');
    await expect(tour.getByRole('button', { name: 'Back' })).toBeHidden();
    const next = tour.getByRole('button', { name: 'Next' });
    await expect(next).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(tour.getByRole('heading')).toHaveText('How the levers work');
    await tour.getByRole('button', { name: 'Back' }).click();
    await expect(tour.getByRole('heading')).toHaveText('What the chart shows');
    await next.click();
    await next.click();
    await expect(tour.locator('.tour-progress')).toHaveText('Step 3 of 3');
    await expect(tour.getByRole('heading')).toHaveText('Where the causes are');
    await expect(tour.getByRole('button', { name: 'Start exploring' })).toBeVisible();
    const box = await tour.boundingBox();
    const width = page.viewportSize()?.width ?? 0;
    expect(box && box.x >= 0 && box.x + box.width <= width).toBe(true);
    await noHorizontalScroll(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog.tour')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('main[data-ready]')).toBeAttached();
    await expect(page.locator('dialog.tour')).toHaveCount(0);

    await open(page, `${START}&tour=1`);
    await expect(tour).toBeVisible();
    await tour.getByRole('button', { name: 'Skip' }).click();
    await expect(tour).toHaveCount(0);
    await openDiet(page);
  },
);

test(
  'the guided start speaks French and stays closed with tour=0',
  { tag: TOUR },
  async ({ page }) => {
    await open(page, `${START}&tour=0`);
    await expect(page.locator('dialog.tour')).toHaveCount(0);
    await page.locator('button[data-lang="fr"]').click();
    await open(page, START);
    const tour = page.getByRole('dialog', { name: 'Premiers pas' });
    await expect(tour).toBeVisible();
    await expect(tour.getByRole('heading')).toHaveText('Ce que montre le graphique');
    await tour.getByRole('button', { name: 'Suivant' }).click();
    await expect(tour.locator('.tour-progress')).toHaveText('Étape 2 sur 3');
  },
);

test('moving the shift recolours the map and raises the avoided warming', async ({ page }) => {
  await open(page, `${START}&shift=10`);
  const fills = () =>
    page
      .locator('path.country.has-data')
      .evaluateAll((paths) => paths.map((p) => getComputedStyle(p).fill).join('|'));
  await page.locator('#chart-tab-avoided').click();
  await expect(page).toHaveURL(/chart=avoided/);
  await expect(page.locator('.avoided-chart .chart-empty')).toHaveCount(0);
  const before = { fills: await fills(), top: await lastY(page, '.avoided-chart .scenario-line') };
  await openDiet(page);
  await page.locator('#shift').fill('80');
  await expect(page).toHaveURL(/shift=80/);
  await expect.poll(fills).not.toBe(before.fills);
  expect(await lastY(page, '.avoided-chart .scenario-line')).not.toBe(before.top);
});

test('the Waste tab stacks food by stage with the levers, and municipal waste the levers leave', async ({
  page,
}) => {
  await open(page, `${START}&chart=waste&fw=50`);
  const panel = page.locator('#chart-panel-waste');
  await expect(panel.locator('.waste-bar')).toHaveCount(2);
  const labels = panel.locator('.waste-bar-label');
  await expect(labels.first()).toContainText('Today');
  await expect(labels.nth(1)).toContainText('With the levers in place');
  await expect(panel.locator('.waste-plastic')).toContainText('No lever changes it');
  await page.locator('label[for="wasteview-treatment"]').click();
  await expect(page).toHaveURL(/wasteview=treatment/);
  await expect(panel.locator('.waste-bar')).toHaveCount(5);
  await expect(panel.locator('.chart-legend')).toContainText('Never collected');
  await expect(panel.locator('figcaption')).toContainText('No lever changes it');
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()?.width ?? width);
});

test('the waste layer says which waste the levers change', async ({ page }) => {
  await open(page, `${START}&layer=waste&waste=municipal&mapview=table`);
  await expect(page.locator('.map-note')).toContainText('No lever changes it');
  await expect(page.locator('#map-panel-table tbody tr')).toHaveCount(4);
  await page.locator('label[for="wasteOf-food"]').click();
  await expect(page.locator('.map-note')).toContainText('cut it');
});

test('the charts are tabs, global temperature first, and reach 2100', async ({ page }) => {
  await open(page, `${START}&shift=50`);
  await expect(page.locator('#chart-tab-temperature')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#chart-panel-temperature')).toBeVisible();
  await expect(page.locator('#chart-panel-avoided')).toBeHidden();
  const legend = page.locator('.temperature-chart > .chart-legend');
  await expect(legend).toContainText('Modelled');
  await expect(legend).toContainText('Modelled with levers');
  await expect(legend).not.toContainText('shift');
  await expect(legend).not.toContainText('farming');
  await expect(page.locator('.temperature-chart .agriculture-band')).toHaveCount(0);
  await expect(page.locator('.gap-annotation text')).toContainText('2050');
  await page.locator('label[for="horizon-2100"]').click();
  await expect(page).toHaveURL(/to=2100/);
  await expect(page.locator('.gap-annotation text')).toContainText('2100');
  await expect(page.locator('.stat-hero dt')).toContainText('2100');
  await page.locator('#chart-tab-avoided').click();
  await expect(page.locator('#chart-panel-avoided')).toBeVisible();
  await expect(page.locator('#chart-panel-temperature')).toBeHidden();
  await expect(page.locator('.avoided-chart svg')).toContainText('2100');
});

test('the chart tabs and the chart values are reachable from the keyboard', async ({ page }) => {
  await open(page, `${START}&shift=50`);
  await page.locator('#chart-tab-temperature').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#chart-tab-cause')).toBeFocused();
  await expect(page.locator('#chart-tab-cause')).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/chart=cause/);
  await page.keyboard.press('End');
  await expect(page.locator('#chart-tab-waste')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#chart-tab-temperature')).toBeFocused();
  await expect(page.locator('#chart-panel-temperature')).toBeVisible();
  const plot = page.locator('.temperature-chart > .chart-plot');
  const tooltip = plot.locator('.chart-tooltip');
  await plot.focus();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Home');
  await expect(tooltip.locator('strong')).toHaveText('1850');
  await page.keyboard.press('ArrowRight');
  await expect(tooltip.locator('strong')).toHaveText('1851');
  await expect(tooltip).toContainText('Observed');
  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
  // A redraw while the chart keeps the focus (here a resize) leaves it dismissed.
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.width - 40, height: size.height });
  await page.waitForTimeout(300);
  await expect(tooltip).toBeHidden();
  await page.keyboard.press('ArrowLeft');
  await expect(tooltip).toBeVisible();
});

test('the summary announces one short sentence, not the whole section', async ({ page }) => {
  await open(page, `${START}&shift=50`);
  await expect(page.locator('.summary')).not.toHaveAttribute('aria-live');
  await expect(page.locator('.summary [role="status"]')).toHaveText(
    /^Less warming in 2050: .+°C\.$/,
  );
});

test('the land use layer draws the share of land farmed and keeps its URL key', async ({
  page,
}) => {
  await open(page, `${START}&shift=50`);
  await expect(page.locator('label[for="layer-land"]')).toHaveText('Land use');
  await page.locator('label[for="layer-land"]').click();
  await expect(page).toHaveURL(/layer=land/);
  await expect(page.locator('.legend-title')).toContainText('Share of the land farmed');
  await expect(page.locator('.legend li').first()).toContainText('%');
  await expect(page.locator('[data-control="gas"]')).toBeHidden();
  await expect(page.locator('[data-control="group"]')).toBeHidden();
  await expect(page.locator('path.country.has-data').first()).toBeVisible();
  await page.locator('path.country.has-data').first().click();
  const tooltip = page.locator('.map-frame .tooltip');
  await expect(tooltip).toContainText('Share of the land farmed');
  await expect(tooltip).toContainText('Farmland');
  await expect(tooltip).toContainText('Cropland');
  await expect(tooltip).toContainText('Pasture');
  await expect(tooltip).toContainText('ha');
  const other = await page.context().newPage();
  await other.goto(`${START}&layer=land`);
  await expect(other.locator('#layer-land')).toBeChecked();
  await expect(other.locator('.legend-title')).toContainText('Share of the land farmed');
  await other.close();
});

test('the change layer shows the change in farmland', async ({ page }) => {
  await open(page, `${START}&shift=50&layer=change`);
  const fills = () =>
    page
      .locator('path.country.has-data')
      .evaluateAll((paths) => paths.map((p) => getComputedStyle(p).fill).join('|'));
  const before = await fills();
  await page.locator('label[for="changeOf-land"]').click();
  await expect(page).toHaveURL(/change=land/);
  await expect(page.locator('.legend-title')).toContainText('Farmland');
  await expect(page.locator('.legend li').first()).toContainText('%');
  await expect.poll(fills).not.toBe(before);
});

test('natural regrowth adds the CO₂ taken up to the summary, and leaves when off', async ({
  page,
}) => {
  await open(page, `${START}&shift=50`);
  await expect(page.locator('.summary .stat-land')).toContainText('Farmland freed');
  await expect(page.locator('.summary .stat-land')).toContainText('Mha');
  await expect(page.locator('.summary .stat-regrowth')).toHaveCount(0);
  const hero = await page.locator('.summary .stat-hero .stat-value').innerText();
  await page.locator('#panel-tab-options').click();
  await page.locator('label[for="option-regrowth-natural"]').click();
  await expect(page).toHaveURL(/regrow=natural/);
  await expect(page.locator('.summary .stat-regrowth')).toContainText('taken up by regrowth');
  await expect
    .poll(() => page.locator('.summary .stat-hero .stat-value').innerText())
    .not.toBe(hero);
  await page.locator('label[for="option-regrowth-none"]').click();
  await expect(page).not.toHaveURL(/regrow=/);
  await expect(page.locator('.summary .stat-regrowth')).toHaveCount(0);
  await expect(page.locator('.summary .stat-hero .stat-value')).toHaveText(hero);
});

const LEVER_FAMILIES: [string, string, string][] = [
  ['practices', 'feedAdditives', 'fa'],
  ['waste', 'foodWaste', 'fw'],
  ['deforestation', 'deforestation', 'df'],
  ['removals', 'coverCrops', 'cc'],
  ['energy', 'electricCars', 'ev'],
];

test('the Levers section opens and each family’s slider changes the summary and the URL', async ({
  page,
}) => {
  await open(page);
  await expect(page.locator('.levers h2')).toHaveText('Levers');
  for (const [family, lever, key] of LEVER_FAMILIES) {
    await test.step(family, async () => {
      const fold = page.locator(`details[data-group="levers-${family}"]`);
      await fold.locator('summary').click();
      await expect(fold).toHaveAttribute('open', '');
      const slider = page.locator(`#lever-${lever}`);
      await expect(slider).toBeVisible();
      const [before, url] = [await summaryText(page), page.url()];
      await slider.fill('60');
      await expect(page).toHaveURL(new RegExp(`${key}=60`));
      await expect.poll(() => page.url()).not.toBe(url);
      await expect.poll(() => summaryText(page)).not.toBe(before);
    });
  }
  await expect(page.locator('.lever-breakdown')).toBeVisible();
  for (const [family] of LEVER_FAMILIES) {
    await expect(page.locator(`.breakdown-row[data-family="${family}"]`).first()).toBeVisible();
  }
  await expect(page.locator('.breakdown-cause').first()).toHaveAttribute(
    'data-cause',
    'fossilIndustry',
  );
  await noHorizontalScroll(page);
});

test('a family’s buttons adopt all its levers, then reset them', async ({ page }) => {
  await open(page);
  const fold = page.locator('details[data-group="levers-removals"]');
  await fold.locator('summary').click();
  await fold.locator('button[data-action="max"]').click();
  await expect(page).toHaveURL(/cc=100&af=100&bc=100&ew=100/);
  await expect(page.locator('.summary .stat-removals')).toBeVisible();
  await fold.locator('button[data-action="reset"]').click();
  await expect(page).not.toHaveURL(/cc=|af=|bc=|ew=/);
  await expect(page.locator('.summary .stat-removals')).toHaveCount(0);
});

test('the energy fold: each slider and adopt all change the summary and the URL', async ({
  page,
}) => {
  await open(page);
  const fold = page.locator('details[data-group="levers-energy"]');
  await fold.locator('summary').click();
  const keys: [string, string][] = [
    ['electricCars', 'ev'],
    ['electricTrucks', 'et'],
    ['flyLess', 'fl'],
    ['cleanAviationFuel', 'saf'],
    ['cleanShipping', 'cs'],
    ['renewableElectricity', 're'],
  ];
  for (const [lever, key] of keys) {
    await test.step(lever, async () => {
      const before = await summaryText(page);
      await page.locator(`#lever-${lever}`).fill('40');
      await expect(page).toHaveURL(new RegExp(`[?&]${key}=40`));
      await expect.poll(() => summaryText(page)).not.toBe(before);
      await expect(fold.locator('[data-lever] .info-tip').first()).not.toBeEmpty();
    });
  }
  await fold.locator('button[data-action="reset"]').click();
  await expect(page).not.toHaveURL(/[?&](ev|et|fl|saf|cs|re)=/);
  await fold.locator('button[data-action="max"]').click();
  await expect(page).toHaveURL(/ev=100&et=100&fl=100&saf=100&cs=100&re=100/);
  await expect(page.locator('.breakdown-row')).toHaveCount(0);
  await openDiet(page);
  await page.locator('#shift').fill('30');
  await expect(
    page.locator(
      '.breakdown-cause[data-cause="fossilIndustry"] .breakdown-row[data-family="energy"]',
    ),
  ).toBeVisible();
  await expect(
    page.locator(
      '.breakdown-cause[data-cause="airPollution"] .breakdown-row[data-family="energy"]',
    ),
  ).toBeVisible();
  await expect(
    page.locator('.breakdown-cause[data-cause="agriculture"] .breakdown-row[data-family="diet"]'),
  ).toBeVisible();
  await noHorizontalScroll(page);
});

test('the fish and seafood slider shifts seafood alone', async ({ page }) => {
  await open(page);
  await openDiet(page);
  await page.locator('details[data-fold="advanced"] > summary').click();
  const slider = page.locator('#group-seafood');
  await expect(page.locator('label[for="group-seafood"]')).toHaveText('Fish and seafood');
  const before = await summaryText(page);
  await slider.fill('70');
  await expect(page).toHaveURL(/sea=70/);
  await expect.poll(() => summaryText(page)).not.toBe(before);
  await openDiet(page);
  await page.locator('#shift').fill('20');
  await expect(slider).toHaveValue('70');
  await expect(page.locator('#group-dairy')).toHaveValue('20');
  await noHorizontalScroll(page);
});

test('a chart’s legend shows or hides each of its series', async ({ page }) => {
  await open(page);
  const observed = page.locator('.temperature-chart button[data-toggle="observed"]');
  await expect(observed).toHaveAttribute('aria-pressed', 'true');
  await observed.click();
  await expect(observed).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.temperature-chart .observed-line')).toBeHidden();
  await observed.click();
  await expect(page.locator('.temperature-chart .observed-line')).toBeVisible();
  await page.locator('#chart-tab-cause').click();
  const farming = page.locator('.attribution-chart button[data-toggle="agriculture"]');
  await expect(page.locator('.attribution-chart .stack.cause-agriculture')).toHaveCount(1);
  await farming.click();
  await expect(page.locator('.attribution-chart .stack.cause-agriculture')).toHaveCount(0);
  await expect(farming).toHaveAttribute('aria-pressed', 'false');
  await farming.click();
  await expect(page.locator('.attribution-chart .stack.cause-agriculture')).toHaveCount(1);
});

test('the data-centre and permafrost options move the baseline', async ({ page }) => {
  await open(page);
  await page.locator('label[for="horizon-2100"]').click();
  await page.locator('#panel-tab-options').click();
  // The axis rescales with the curve, so compare the drawn path, not its end in pixels.
  const baseline = () => page.locator('.temperature-chart .baseline-line').getAttribute('d');
  const start = await baseline();
  await page.locator('label[for="option-permafrost-off"]').click();
  await expect(page).toHaveURL(/pf=off/);
  await expect.poll(baseline).not.toBe(start);
  await page.locator('label[for="option-permafrost-on"]').click();
  await expect(page).not.toHaveURL(/pf=/);
  await expect.poll(baseline).toBe(start);
  await page.locator('label[for="option-dataCentres-ssp"]').click();
  await expect(page).toHaveURL(/dc=ssp/);
  await expect.poll(baseline).not.toBe(start);
});

test('the population option moves the baseline and the population area behind it', async ({
  page,
}) => {
  await open(page);
  await expect(page.locator('.population-chart')).toHaveCount(0);
  await page.locator('label[for="horizon-2100"]').click();
  await page.locator('#panel-tab-options').click();
  const baseline = () => page.locator('.temperature-chart .baseline-line').getAttribute('d');
  const area = () => page.locator('.temperature-chart .population-area').getAttribute('d');
  const [start, startArea] = [await baseline(), await area()];
  await page.locator('label[for="option-population-low"]').click();
  await expect(page).toHaveURL(/pop=low/);
  await expect.poll(baseline).not.toBe(start);
  await expect.poll(area).not.toBe(startArea);
  await page.locator('label[for="option-population-medium"]').click();
  await expect(page).not.toHaveURL(/pop=/);
  await noHorizontalScroll(page);
});

test('the temperature chart’s hover gives the world population', async ({ page }) => {
  await open(page);
  const temperature = page.locator('.temperature-chart > .chart-plot');
  await temperature.locator('.hover-target').hover();
  await expect(temperature.locator('.chart-tooltip')).toContainText('World population');
});

test('a reload restores the levers from the URL', async ({ page }) => {
  await open(page, `${START}&fa=40&fw=25&cc=20`);
  await page.waitForLoadState('networkidle');
  const summary = await summaryText(page);
  await page.reload();
  await expect(page.locator('main[data-ready]')).toBeAttached();
  await page.locator('details[data-group="levers-practices"] > summary').click();
  await page.locator('details[data-group="levers-waste"] > summary').click();
  await page.locator('details[data-group="levers-removals"] > summary').click();
  await expect(page.locator('#lever-feedAdditives')).toHaveValue('40');
  await expect(page.locator('#lever-foodWaste')).toHaveValue('25');
  await expect(page.locator('#lever-coverCrops')).toHaveValue('20');
  await expect(page.locator('#lever-biochar')).toHaveValue('0');
  await expect.poll(() => summaryText(page)).toBe(summary);
  await noHorizontalScroll(page);
});

test('the panel is in groups, all closed, under their causes, with the time settings on top', async ({
  page,
}) => {
  await open(page);
  const groups = page.locator('.panel details.group');
  await expect(groups).toHaveCount(7);
  await expect(page.locator('#panel-tab-levers')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panel-panel-options')).toBeHidden();
  for (const id of [
    'diet',
    ...['practices', 'waste', 'deforestation', 'removals', 'energy', 'industry'].map(
      (m) => `levers-${m}`,
    ),
  ]) {
    await expect(page.locator(`details[data-group="${id}"]`)).not.toHaveAttribute('open');
  }
  const horizon = page.locator('.panel .panel-horizon');
  await expect(horizon).toContainText('Results up to');
  expect(
    await horizon.evaluate((h) =>
      Boolean(h.compareDocumentPosition(document.getElementById('panel-content') as Node) & 4),
    ),
  ).toBe(true);
  const time = page.locator('#panel-panel-levers > *').first();
  await expect(time).toHaveClass(/\btime-settings\b/);
  await expect(time.locator('> *').first()).toHaveAttribute('data-control', 'timing');
  await expect(page.locator('details[data-group="diet"] #rampEnd')).toHaveCount(0);
  await expect(page.locator('.timing label')).toHaveText('All levers fully in place by');
  await expect(
    page.locator('.cause-section[data-cause="agriculture"] details[data-group="diet"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.cause-section[data-cause="fossilIndustry"] details[data-group="levers-energy"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.cause-section[data-cause="landUse"] details[data-group="levers-deforestation"]'),
  ).toHaveCount(1);
  const meta = (id: string) => page.locator(`details[data-group="${id}"] .group-meta`);
  await expect(meta('diet')).toHaveText('No shift yet');
  await expect(meta('levers-practices')).toHaveText('None of 6 adopted');
  await expect(page.locator('#panel-tab-options')).toHaveText('Other options');
  await openDiet(page);
  await page.locator('#shift').fill('40');
  await expect(meta('diet')).toHaveText('40% moved');
  const practices = page.locator('details[data-group="levers-practices"]');
  await practices.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(practices).toHaveAttribute('open', '');
  await page.locator('#lever-feedAdditives').fill('50');
  await expect(meta('levers-practices')).toHaveText('1 of 6 adopted');
  await practices.locator('summary').click();
  await expect(practices).not.toHaveAttribute('open');
  await expect(meta('levers-practices')).toBeVisible();
  await page.locator('#panel-tab-options').click();
  await page.locator('label[for="option-ssp-ssp126"]').click();
  await expect(page.locator('#panel-tab-options')).toContainText('1');
  await noHorizontalScroll(page);
});

test('the causes are ordered by size and their groups by worth, and sliders never reorder them', async ({
  page,
}) => {
  await open(page);
  const order = () =>
    page
      .locator('.cause-section')
      .evaluateAll((sections) =>
        sections.map((s) =>
          [
            (s as HTMLElement).dataset.cause,
            ...[...s.querySelectorAll('details.group')].map(
              (g) => (g as HTMLElement).dataset.group,
            ),
          ].join(' '),
        ),
      );
  await expect(page.locator('[data-worth="family:industry"]')).toBeVisible();
  await expect(page.locator('[data-worth="family:removals"]')).toBeVisible();
  await expect(page.locator('[data-worth="diet"]')).toBeVisible();
  await expect.poll(async () => (await order())[0]?.split(' ')[0]).toBe('fossilIndustry');
  const worth = (id: string) =>
    page
      .locator(`.cause-section details[data-group="${id}"] > summary [data-worth]`)
      .evaluate((el) => Math.abs(Number.parseFloat((el.textContent ?? '').replace('−', '-'))) || 0);
  const farming =
    (await order())
      .find((o) => o.startsWith('agriculture'))
      ?.split(' ')
      .slice(1) ?? [];
  const values = await Promise.all(farming.map(worth));
  expect([...values].sort((a, b) => b - a)).toEqual(values);
  const before = await order();
  await openDiet(page);
  await page.locator('#shift').fill('60');
  await page.locator('#rampEnd').fill('2045');
  await page.locator('details[data-group="levers-practices"] > summary').click();
  await page.locator('#lever-feedAdditives').fill('100');
  await page.waitForTimeout(1500);
  expect(await order()).toEqual(before);
});

test('each group and lever shows the warming it would avoid alone, in full', async ({ page }) => {
  await open(page);
  const pill = (id: string) => page.locator(`[data-worth="${id}"]`);
  await expect(pill('diet')).toBeVisible();
  await expect(pill('diet')).toContainText('°C');
  await expect(pill('diet')).toContainText('−');
  await expect(pill('family:energy')).toBeVisible();
  await page.locator('details[data-group="levers-practices"] > summary').click();
  await expect(pill('lever:feedAdditives')).toBeVisible();
  const before = await pill('diet').innerText();
  await page.locator('label[for="horizon-2100"]').click();
  await expect.poll(() => pill('diet').innerText()).not.toBe(before);
  await expect(page.locator('.levers-head .info-tip')).toContainText('in 2100 on its own');
});

test('the temperature chart marks the Paris Agreement levels and natural factors', async ({
  page,
}) => {
  await open(page, `${START}&shift=50`);
  const chart = page.locator('.temperature-chart');
  await expect(chart.locator('.milestone')).toHaveCount(2);
  await expect(chart.locator('.milestone text').first()).toContainText('°C');
  await expect(chart.locator('.milestone title').first()).toContainText('Paris Agreement');
  await expect(chart.locator('.crossing-scenario').first()).toBeVisible();
  await expect(chart.locator('.natural-line')).toHaveCount(1);
  await expect(chart.locator(':scope > .chart-legend')).toContainText('Natural factors only');
  await expect(chart.locator('.policies')).toHaveCount(0);
  await expect(chart.locator('.milestone-caption')).toContainText('20-year averages');
  await page.locator('label[for="horizon-2100"]').click();
  await expect(chart.locator('.policies rect')).toHaveCount(1);
  await expect(chart.locator(':scope > .chart-legend')).toContainText('Current policies by 2100');
  const lines = page.locator('.milestones-summary li');
  await expect(lines).toHaveCount(4);
  await expect(lines.nth(0)).toContainText('1.5 °C');
  await expect(lines.nth(2)).toContainText('of the gap to 2 °C');
  await expect(lines.nth(3)).toContainText('°C');
});

test('the temperature chart marks El Niño and La Niña years on the observed line', async ({
  page,
}) => {
  await open(page, `${START}&shift=50`);
  const chart = page.locator('.temperature-chart');
  await expect(chart.locator('.enso-mark.enso-elNino')).not.toHaveCount(0);
  await expect(chart.locator('.enso-mark.enso-laNina')).not.toHaveCount(0);
  await expect(chart.locator(':scope > .chart-legend')).toContainText('El Niño and La Niña years');
  await expect(chart.locator('.milestone-caption')).toContainText('±0.2 °C');
  const mark = chart.locator('.enso-mark.enso-elNino').first();
  const target = chart.locator(':scope > .chart-plot .hover-target');
  const cx = Number(await mark.getAttribute('cx'));
  const height = Number(await target.getAttribute('height'));
  await target.click({ position: { x: cx, y: height / 2 } });
  await expect(chart.locator(':scope > .chart-plot .chart-tooltip')).toContainText('El Niño year');
});

test('the chart comes before the map', async ({ page }) => {
  await open(page);
  const top = (selector: string) =>
    page.locator(selector).evaluate((el) => el.getBoundingClientRect().top);
  expect(await top('.chart-card')).toBeLessThan(await top('.map-card'));
});

test(
  'the chart opens the page, with the panel before it in the reading order',
  { tag: CLOSED_PANEL },
  async ({ page }) => {
    await open(page);
    const box = async (selector: string) =>
      page.locator(selector).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      });
    const chart = await box('.chart-card');
    expect(chart.top).toBeLessThan(page.viewportSize()!.height);
    expect(
      await page.evaluate(() =>
        document
          .querySelector('.panel')!
          .compareDocumentPosition(document.querySelector('.chart-card')!),
      ),
    ).toBe(4);
    const panel = await box('.panel');
    if (page.viewportSize()!.width <= 860) {
      expect(panel.bottom).toBeLessThanOrEqual(chart.top);
    } else {
      expect(panel.top).toBeLessThan(chart.bottom);
    }
  },
);

test('the deforestation layer shows the forest cleared, with its CO₂ in the tooltip', async ({
  page,
}) => {
  await open(page, `${START}&shift=50`);
  await page.locator('label[for="layer-deforestation"]').click();
  await expect(page).toHaveURL(/layer=deforestation/);
  await expect(page.locator('.legend-title')).toContainText('Forest cleared for farming');
  await expect(page.locator('.legend li').last()).toContainText('No clearing');
  await expect(page.locator('[data-control="gas"]')).toBeHidden();
  const brazil = page.locator('path.country[data-iso3="BRA"]');
  await brazil.click();
  const tooltip = page.locator('.map-frame .tooltip');
  await expect(tooltip).toContainText('Forest cleared for farming');
  await expect(tooltip).toContainText('ha');
  await expect(tooltip).toContainText('CO₂ from the clearing');
  await expect(tooltip).toContainText('Mt');
  await expect(tooltip).not.toContainText('Least precise source');
});

test('the land-use CO₂ layer shows net CO₂, sinks included, and what the levers change', async ({
  page,
}) => {
  await open(page, `${START}&shift=50&df=100`);
  await page.locator('label[for="layer-landCo2"]').click();
  await expect(page).toHaveURL(/layer=landCo2/);
  await expect(page.locator('.legend-title')).toContainText('land-use change');
  await expect(page.locator('.legend li').first()).toContainText('−100 Mt');
  await expect(page.locator('.map-note')).toContainText('The levers change two parts of it');
  await expect(page.locator('path.country[data-iso3="USA"]')).not.toHaveClass(/has-data/);
  await page.locator('path.country[data-iso3="IND"]').click();
  const tooltip = page.locator('.map-frame .tooltip');
  await expect(tooltip).toContainText('Today');
  await expect(tooltip).toContainText('−50 Mt');
  await expect(tooltip).toContainText('With the levers');
  await expect(tooltip).toContainText('Of which clearing for farming');
  await expect(tooltip).not.toContainText('Least precise source');
});

test('the farmed mammals layer shows live weight per km² of land, today and with the levers', async ({
  page,
}) => {
  await open(page, `${START}&shift=50`);
  await page.locator('label[for="layer-mammals"]').click();
  await expect(page).toHaveURL(/layer=mammals/);
  await expect(page.locator('.legend-title')).toContainText('per km² of land');
  await expect(page.locator('.legend li').first()).toContainText('t/km²');
  await expect(page.locator('.map-note')).toContainText('Animals kept for work stay');
  await expect(page.locator('path.country[data-iso3="NGA"]')).not.toHaveClass(/has-data/);
  await page.locator('path.country[data-iso3="FRA"]').click();
  const tooltip = page.locator('.map-frame .tooltip');
  await expect(tooltip).toContainText('Farmed mammals per km² of land');
  await expect(tooltip).toContainText('16 t/km²');
  await expect(tooltip).toContainText('Live weight of farmed mammals');
  await expect(tooltip).not.toContainText('Least precise source');
  await page.locator('#map-tab-table').click();
  await expect(page.locator('.data-table tbody tr')).toHaveCount(4);
});

test("the species layer shows the species committed by each country's farmland", async ({
  page,
}) => {
  await open(page, `${START}&shift=50`);
  await page.locator('label[for="layer-species"]').click();
  await expect(page).toHaveURL(/layer=species/);
  await expect(page.locator('.legend-title')).toContainText('committed to extinction');
  await expect(page.locator('.map-note')).toContainText('Scherer et al. (2023)');
  await expect(page.locator('path.country[data-iso3="NGA"]')).not.toHaveClass(/has-data/);
  await page.locator('path.country[data-iso3="FRA"]').click();
  const tooltip = page.locator('.map-frame .tooltip');
  await expect(tooltip).toContainText('Species committed to extinction');
  await expect(tooltip).toContainText('Farmland');
  await expect(tooltip).toContainText('species');
  await page.locator('label[for="speciesPer-farmland"]').click();
  await expect(page).toHaveURL(/per=farmland/);
  await expect(page.locator('.legend-title')).toContainText('per Mha');
  await expect(page.locator('.legend li').first()).toContainText('species/Mha');
  await page.locator('#map-tab-table').click();
  await expect(page.locator('.data-table tbody tr')).toHaveCount(4);
});

test('the summary gives the species committed and the fish left, and regrowth gives species back', async ({
  page,
}) => {
  await open(page, `${START}&shift=100`);
  const species = page.locator('.summary .stat-species');
  await expect(species).toContainText('Species committed to extinction by farmland');
  await expect(species).toContainText('gives none back');
  const fish = page.locator('.summary .stat-fish');
  await expect(fish).toContainText('Bianchi et al. 2021');
  await expect(fish.locator('.stat-value')).toContainText('33% →');
  await expect(fish.locator('.stat-value')).not.toHaveText('33% → 33%');
  await open(page, `${START}&shift=100&regrow=natural`);
  await expect(species).toContainText('once freed farmland has grown back');
});

test('the Emissions tooltip gives food after the farm and the footprint per person', async ({
  page,
}) => {
  await open(page, `${START}&shift=50`);
  await page.locator('path.country[data-iso3="FRA"]').click();
  const tooltip = page.locator('.map-frame .tooltip');
  await expect(tooltip).toContainText('After the farm');
  await expect(tooltip).toContainText('Food footprint per person, a year');
});

test('the freshwater layers give the litres withdrawn and, apart, the crops’ scarcity-weighted use', async ({
  page,
}) => {
  await open(page, `${START}&shift=50`);
  await page.locator('label[for="layer-water"]').click();
  await expect(page).toHaveURL(/layer=water/);
  await expect(page.locator('.legend-title')).toContainText('Freshwater withdrawn for farming');
  await expect(page.locator('.map-note')).toContainText('Poore & Nemecek (2018)');
  await expect(page.locator('path.country[data-iso3="NGA"]')).not.toHaveClass(/has-data/);
  await page.locator('path.country[data-iso3="FRA"]').click();
  const tooltip = page.locator('.map-frame .tooltip');
  await expect(tooltip).toContainText('Freshwater withdrawn, a year');
  await expect(tooltip).toContainText('billion m³');
  await expect(tooltip).toContainText('Land equipped for irrigation');
  await page.locator('#map-tab-table').click();
  await expect(page.locator('.data-table tbody tr')).toHaveCount(4);
  await page.locator('#map-tab-map').click();
  await page.locator('label[for="layer-waterScarcity"]').click();
  await expect(page).toHaveURL(/layer=waterScarcity/);
  await expect(page.locator('.legend-title')).toContainText('(L eq)');
  await expect(page.locator('.legend li').first()).toContainText('eq');
  await expect(page.locator('path.country[data-iso3="BRA"]')).not.toHaveClass(/has-data/);
});

test('the summary gives the freshwater withdrawn, today and with the levers', async ({ page }) => {
  await open(page, `${START}&shift=100`);
  const stat = page.locator('.summary .stat-water');
  await expect(stat).toContainText('Freshwater withdrawn for farming');
  await expect(stat.locator('.stat-value')).toContainText('→');
  await expect(stat.locator('.stat-value')).toContainText('billion m³');
  await expect(stat).toContainText('Water does not change the warming');
});

test('the summary sets the farmed mammals against the wild ones, and a shift lowers it', async ({
  page,
}) => {
  await open(page);
  const stat = page.locator('.summary .stat-mammals');
  await expect(stat).toContainText('Farmed mammals to wild ones, by weight');
  await expect(stat.locator('.stat-value')).toHaveText('3.4 to 1 → 3.4 to 1');
  await expect(stat).toContainText('Greenspoon et al. 2023');
  await open(page, `${START}&shift=100`);
  await expect(stat.locator('.stat-value')).toContainText('3.4 to 1 →');
  await expect(stat.locator('.stat-value')).not.toHaveText('3.4 to 1 → 3.4 to 1');
});

test('the farm practices’ breakdown is left out of the first load, loads once, then acts', async ({
  page,
}) => {
  const breakdown = (url: string) => url.endsWith('/breakdown.json');
  const asked: string[] = [];
  page.on('request', (r) => asked.push(r.url()));
  await open(page);
  expect(asked.filter(breakdown)).toEqual([]);
  const before = await summaryText(page);
  await page.locator('details[data-group="levers-practices"] > summary').click();
  const slider = page.locator('#lever-feedAdditives');
  await expect(slider).toBeEnabled();
  await slider.fill('60');
  await expect.poll(() => asked.filter(breakdown).length).toBe(1);
  await expect.poll(() => summaryText(page)).not.toBe(before);
  await page.locator('#lever-riceWater').fill('30');
  await page.waitForLoadState('networkidle');
  expect(asked.filter(breakdown)).toHaveLength(1);
});

test('a deferred file that fails says so and is not asked for again', async ({ page }) => {
  const asked: string[] = [];
  await page.route('**/breakdown.json', (route) => {
    asked.push(route.request().url());
    return route.abort();
  });
  await open(page);
  await page.locator('details[data-group="levers-practices"] > summary').click();
  await page.locator('#lever-feedAdditives').fill('60');
  await expect(page.locator('.run-error').filter({ hasText: 'breakdown.json' })).toBeVisible();
  await page.locator('#lever-riceWater').fill('30');
  await page.locator('#lever-feedAdditives').fill('70');
  await page.waitForLoadState('networkidle');
  expect(asked).toHaveLength(1);
  errors = errors.filter((e) => !e.includes('net::ERR_FAILED'));
});

test('a language switch keeps the chart range', async ({ page }) => {
  await open(page);
  await page.locator('label[for="range-recent"]').click();
  await expect(page).toHaveURL(/range=recent/);
  await page.locator('button[data-lang="fr"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('#range-recent')).toBeChecked();
  await expect(page.locator('.temperature-chart > .chart-plot .axis-x')).not.toContainText('1850');
});

const readDownload = async (page: Page, click: () => Promise<void>) => {
  const [download] = await Promise.all([page.waitForEvent('download'), click()]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  const bytes = Buffer.concat(chunks);
  return { name: download.suggestedFilename(), text: bytes.toString('utf8'), bytes };
};

/** Picks a format from the chart card's Download menu. */
const chartFormat = (page: Page, format: 'csv' | 'png' | 'svg') => async () => {
  await page.locator('.chart-card .download-chart').click();
  await page.locator(`.chart-card [role="menuitem"][data-format="${format}"]`).click();
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

test('the map card switches to a table and back, kept in the URL', async ({ page }) => {
  await open(page, `${START}&shift=50`);
  await expect(page.locator('#map-tab-map')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#map-tab-table').click();
  await expect(page).toHaveURL(/mapview=table/);
  await expect(page.locator('#map-panel-table')).toBeVisible();
  await expect(page.locator('#map-panel-map')).toBeHidden();
  const rows = page.locator('.data-table tbody tr');
  await expect(rows).toHaveCount(5);
  await page.locator('label[for="layer-land"]').click();
  await expect(page.locator('.data-table thead th')).toHaveCount(4);
  await page.locator('#map-tab-table').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page).not.toHaveURL(/mapview=/);
  await expect(page.locator('#map-tab-map')).toBeFocused();
  await expect(page.locator('#map-panel-map')).toBeVisible();
  await page.goto(`${START}&shift=50&mapview=table`);
  await expect(page.locator('#map-panel-table')).toBeVisible();
});

test('the table sorts by each column and searches both languages', async ({ page }) => {
  await open(page, `${START}&shift=50&mapview=table&layer=emissions`);
  const first = () => page.locator('.data-table tbody tr').first().getAttribute('data-iso3');
  const nameHead = page.locator('.data-table th[data-column="name"]');
  await expect(page.locator('.data-table th[data-column="after"]')).toHaveAttribute(
    'aria-sort',
    'descending',
  );
  await nameHead.locator('button').click();
  await expect(nameHead).toHaveAttribute('aria-sort', 'ascending');
  expect(await first()).toBe('BRA');
  await nameHead.locator('button').click();
  await expect(nameHead).toHaveAttribute('aria-sort', 'descending');
  expect(await first()).toBe('USA');
  await page.locator('#map-table-search').fill('etats');
  await expect(page.locator('.data-table tbody tr')).toHaveCount(1);
  expect(await first()).toBe('USA');
  await page.locator('#map-table-search').fill('nowhere');
  await expect(page.locator('.table-count')).toContainText('No country matches');
});

test('the table pages through every country of the real data', async ({ page }) => {
  await open(page, '/?shift=40&mapview=table');
  const rows = page.locator('.data-table tbody tr');
  await expect(rows).toHaveCount(20);
  await expect(page.locator('.pager-position')).toHaveText(/^Page 1 of \d+$/);
  await expect(page.locator('.pager-prev')).toBeDisabled();
  const firstOnPage1 = await rows.first().getAttribute('data-iso3');
  await page.locator('.pager-next').click();
  await expect(page.locator('.pager-position')).toHaveText(/^Page 2 of/);
  await expect(page.locator('.table-count')).toContainText('Countries 21–40 of');
  expect(await rows.first().getAttribute('data-iso3')).not.toBe(firstOnPage1);
  await page.locator('#map-table-search').fill('fra');
  await expect(page.locator('.pager')).toBeHidden();
  await expect(rows.filter({ hasText: 'France' })).toHaveCount(1);
  await noHorizontalScroll(page);
});

test('the map and the chart download their data as CSV', async ({ page }) => {
  await open(page, `${START}&shift=50`);
  await page.locator('.download-toggle').click();
  await expect(page.locator('.download-toggle')).toHaveAttribute('aria-expanded', 'true');
  const map = await readDownload(page, () => page.locator('.download-map').click());
  expect(map.name).toMatch(/^planetshift-map-emissions-co2e-shift50-\d{4}\.csv$/);
  expect(map.text.startsWith('﻿iso3,country,layer,measure,')).toBe(true);
  expect(map.text.trimEnd().split('\r\n')).toHaveLength(6);
  const chart = await readDownload(page, chartFormat(page, 'csv'));
  expect(chart.name).toMatch(/^planetshift-temperature-shift50-\d{4}\.csv$/);
  expect(chart.text.startsWith('﻿year,observed_degC,')).toBe(true);
  const scenario = await readDownload(page, () => page.locator('.download-scenario').click());
  expect(JSON.parse(scenario.text)).toMatchObject({ app: 'Planetshift', scenario: { shift: 0.5 } });
  const zip = await readDownload(page, () => page.locator('.download-files-zip').click());
  expect(zip.name).toBe('planetshift-data.zip');
  const entries = unzipSync(new Uint8Array(zip.bytes));
  expect(Object.keys(entries)).toContain('climate.json');
  expect(strFromU8(entries['LICENSE.txt']!)).toContain('climate.json: CC BY-NC-SA 4.0');
  await noHorizontalScroll(page);
});

const quick = (page: Page, scope: string, level: 'zero' | 'full') =>
  page.locator(`.quick[data-quick-scope="${scope}"] button[data-quick="${level}"]`);
const pressed = async (page: Page, scope: string) =>
  (
    await Promise.all(
      (['zero', 'full'] as const).map(async (l) =>
        (await quick(page, scope, l).getAttribute('aria-pressed')) === 'true' ? l : null,
      ),
    )
  ).find((l) => l !== null) ?? 'mixed';
const sliderValues = (page: Page, group: string) =>
  page
    .locator(`details[data-group="${group}"] .lever input[type="range"]`)
    .evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value));

test('a group’s 0% / 100% pair sets its levers and the URL without opening the group', async ({
  page,
}) => {
  await open(page);
  const fold = page.locator('details[data-group="levers-energy"]');
  await expect(quick(page, 'energy', 'full')).toHaveAccessibleName(
    'Set Energy and transport to 100%',
  );
  expect(await pressed(page, 'energy')).toBe('zero');
  const before = await summaryText(page);
  await quick(page, 'energy', 'full').click();
  await expect(page).toHaveURL(/ev=100&et=100&fl=100&saf=100&cs=100&re=100/);
  await expect(fold).not.toHaveAttribute('open');
  expect(new Set(await sliderValues(page, 'levers-energy'))).toEqual(new Set(['100']));
  await expect(fold.locator('.group-meta')).toHaveText('6 of 6 adopted');
  expect(await pressed(page, 'energy')).toBe('full');
  expect(await pressed(page, 'fossilIndustry')).toBe('mixed');
  await expect.poll(() => summaryText(page)).not.toBe(before);
  await fold.locator('summary').click();
  await page.locator('#lever-flyLess').fill('50');
  await expect.poll(() => pressed(page, 'energy')).toBe('mixed');
  await quick(page, 'energy', 'zero').click();
  await expect(page).not.toHaveURL(/[?&](ev|et|fl|saf|cs|re)=/);
  await expect(fold).toHaveAttribute('open', '');
  await expect(page.locator('#lever-flyLess')).toHaveValue('0');
  expect(await pressed(page, 'energy')).toBe('zero');
  await noHorizontalScroll(page);
});

test('the Diet pair sets the main shift and clears the foods set apart', async ({ page }) => {
  await open(page, `${START}&shift=30&dai=20`);
  expect(await pressed(page, 'diet')).toBe('mixed');
  await quick(page, 'diet', 'full').click();
  await expect(page).toHaveURL(/shift=100/);
  await expect(page).not.toHaveURL(/dai=/);
  await expect(page.locator('details[data-group="diet"]')).not.toHaveAttribute('open');
  await expect(page.locator('#shift')).toHaveValue('100');
  await expect(page.locator('#group-dairy')).toHaveValue('100');
  expect(await pressed(page, 'diet')).toBe('full');
  await quick(page, 'diet', 'zero').click();
  await expect(page).not.toHaveURL(/shift=/);
  await expect(page.locator('details[data-group="diet"] .group-meta')).toHaveText('No shift yet');
});

test('a cause’s pair sets every group under it, and the all-levers pair every group', async ({
  page,
}) => {
  await open(page);
  const order = () =>
    page
      .locator('.cause-section details.group')
      .evaluateAll((gs) => gs.map((g) => (g as HTMLElement).dataset.group));
  await expect(page.locator('[data-worth="family:industry"]')).toBeVisible();
  await page.waitForTimeout(1000);
  const before = await order();
  await expect(quick(page, 'agriculture', 'full')).toHaveAccessibleName(
    'Set every lever under Farming to 100%',
  );
  await quick(page, 'agriculture', 'full').click();
  await expect(page).toHaveURL(/shift=100/);
  for (const scope of ['diet', 'practices', 'waste', 'agriculture']) {
    expect(await pressed(page, scope)).toBe('full');
  }
  for (const scope of ['energy', 'deforestation', 'fossilIndustry', 'landUse']) {
    expect(await pressed(page, scope)).toBe('zero');
  }
  expect(await pressed(page, 'all')).toBe('mixed');
  await expect(page.locator('.panel details.group[open]')).toHaveCount(0);

  await expect(quick(page, 'all', 'full')).toHaveAccessibleName('Set all levers to 100%');
  await quick(page, 'all', 'full').click();
  await expect(page).toHaveURL(/ev=100/);
  for (const scope of ['all', 'fossilIndustry', 'agriculture', 'landUse', 'removals', 'industry']) {
    expect(await pressed(page, scope)).toBe('full');
  }
  await page.waitForTimeout(1000);
  expect(await order()).toEqual(before);
  await quick(page, 'all', 'zero').click();
  await expect.poll(() => new URL(page.url()).search).toBe('?data=fixtures');
  expect(await pressed(page, 'all')).toBe('zero');
  await expect(page.locator('.panel details.group[open]')).toHaveCount(0);
  await expect(page.locator('#panel-panel-options .quick')).toHaveCount(0);
  await noHorizontalScroll(page);
});

test('the quick pairs are reached and pressed with the keyboard', async ({ page }) => {
  await open(page);
  const fold = page.locator('details[data-group="levers-waste"]');
  await fold.locator('summary').focus();
  await page.keyboard.press('Tab');
  await expect(quick(page, 'waste', 'zero')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(quick(page, 'waste', 'full')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(fold).not.toHaveAttribute('open');
  await expect.poll(() => pressed(page, 'waste')).toBe('full');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Space');
  await expect.poll(() => pressed(page, 'waste')).toBe('zero');
  await expect(fold).not.toHaveAttribute('open');
});

test('an (i) button shows its text under it, and Escape or a click elsewhere closes it', async ({
  page,
}) => {
  await open(page);
  const button = page.locator('[data-control="timing"] .info');
  const tip = page.locator('[data-control="timing"] .info-tip');
  await expect(tip).toBeHidden();
  await button.click();
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(/from today/);
  const [b, t] = await Promise.all([button.boundingBox(), tip.boundingBox()]);
  expect(t!.y).toBeGreaterThan(b!.y + b!.height - 1);
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  await button.click();
  await page.locator('#levers-title').click();
  await expect(tip).toBeHidden();
});

test('the contents mark the section and heading being read as the page scrolls', async ({
  page,
}) => {
  await page.goto(`${START}&view=methodology#method-climate`);
  const item = page.locator('.toc-item:has(> a[href="#method-climate"])');
  await expect(item).toHaveClass(/active/);
  await expect(page.locator('.toc-item.active')).toHaveCount(1);
  const head = page.locator('#method-climate h2').nth(1);
  const id = await head.getAttribute('id');
  expect(id).toMatch(/^method-climate-/);
  await head.scrollIntoViewIfNeeded();
  await page.evaluate((h) => document.getElementById(h)!.scrollIntoView(), id!);
  await expect(page.locator(`.toc-sub a[href="#${id}"]`)).toHaveAttribute(
    'aria-current',
    'location',
  );
  await expect(page.locator('.toc [aria-current]')).toHaveCount(1);
});

test('the model runs in a Worker', async ({ page }) => {
  await open(page);
  await expect.poll(() => page.workers().length).toBeGreaterThanOrEqual(1);
  await expect(page.locator('.run-error').first()).toBeHidden();
});

test('the footer links to the licences, the source and the deep-time page, and a link’s language wins', async ({
  page,
}) => {
  await open(page);
  const links = page.locator('.footer-links a');
  await expect(links).toHaveCount(4);
  await expect(links.nth(2)).toHaveAttribute('href', /github\.com\/.+\/planetshift$/);
  await expect(links.last()).toHaveAttribute('href', '?view=deeptime');
  await page.evaluate(() => localStorage.setItem('planetshift.lang', 'en'));
  await open(page, `${START}&lang=fr`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

test('the pre-rendered pages hold their text, and the app takes over at the root URL', async ({
  page,
}) => {
  for (const [path, text] of [
    ['/', 'stat-hero'],
    ['/methodology/', 'method-section'],
    ['/fr/', 'lang="fr"'],
    ['/fr/methodology/', 'method-section'],
  ] as const) {
    const html = await (await page.request.get(path)).text();
    expect(html, path).toContain(text);
    expect(html, path).toContain('name="planetshift:entry"');
    expect(html, path).toMatch(/property="og:image" content="[^"]+share-(en|fr)\.png"/);
  }
  for (const lang of ['en', 'fr']) {
    const image = await page.request.get(`/share-${lang}.png`);
    expect(image.headers()['content-type']).toBe('image/png');
  }
  await page.goto('/fr/methodology/?data=fixtures');
  await expect(page.locator('.method-section').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  const where = () => {
    const url = new URL(page.url());
    return `${url.pathname} ${[...url.searchParams]
      .map((p) => p.join('='))
      .sort()
      .join('&')}`;
  };
  await expect.poll(where).toBe('/ data=fixtures&view=methodology');
  await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveAttribute(
    'data-view',
    'methodology',
  );
  await page.evaluate(() => localStorage.setItem('planetshift.lang', 'fr'));
  await open(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

test('the Methodology shows before the model’s data has loaded, without another view’s snapshot', async ({
  page,
}) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/fixtures/supply.json', async (route) => {
    await held;
    await route.continue();
  });
  await page.goto(`${START}&view=methodology`);
  await expect(page.locator('.method-section').first()).toBeVisible();
  await expect(page.locator('.summary')).toHaveCount(0);
  release();
  await page.locator('.site-nav a[data-view="explore"]').click();
  await expect(page.locator('main[data-ready]')).toBeAttached();
  await expect(page.locator('.summary .stat-hero .stat-value')).toBeVisible();
});

test('each chart and the map save as SVG and PNG, with their legend and a credit', async ({
  page,
}) => {
  await open(page, `${START}&shift=50`);
  for (const tab of ['temperature', 'avoided', 'cause'] as const) {
    await page.locator(`#chart-tab-${tab}`).click();
    await expect(page.locator(`#chart-panel-${tab} figure.chart svg`).first()).toBeVisible();
    const svg = await readDownload(page, chartFormat(page, 'svg'));
    expect(svg.name).toMatch(new RegExp(`^planetshift-${tab}-.+\\.svg$`));
    expect(svg.text).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    expect(svg.text).toContain('planetshift.org');
    expect(svg.text).not.toContain('var(--');
    const png = await readDownload(page, chartFormat(page, 'png'));
    expect(png.name).toMatch(new RegExp(`^planetshift-${tab}-.+\\.png$`));
    expect(png.bytes.subarray(0, 4).equals(PNG_SIGNATURE)).toBe(true);
    expect(png.bytes.length).toBeGreaterThan(10_000);
  }
  await page.locator('.download-toggle').click();
  const mapSvg = await readDownload(page, () => page.locator('.download-map-svg').click());
  expect(mapSvg.name).toMatch(/^planetshift-map-.+\.svg$/);
  expect(mapSvg.text).toContain('<path');
  const mapPng = await readDownload(page, () => page.locator('.download-map-png').click());
  expect(mapPng.bytes.subarray(0, 4).equals(PNG_SIGNATURE)).toBe(true);
});

test('the Download menu opens, moves and closes from the keyboard', async ({ page }) => {
  await open(page);
  const button = page.locator('.chart-card .download-chart');
  await button.focus();
  await page.keyboard.press('ArrowDown');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  const items = page.locator('.chart-card [role="menuitem"]');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(items.last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeFocused();
  await button.click();
  await page.locator('#levers-title').click();
  await expect(page.locator('.chart-card [role="menu"]')).toBeHidden();
});

test('every slider and switch of the panel has a note behind an (i)', async ({ page }) => {
  await open(page);
  const controls = page.locator('aside.panel .slider, aside.panel .segmented');
  const count = await controls.count();
  expect(count).toBeGreaterThan(20);
  for (let i = 0; i < count; i++) {
    await expect(controls.nth(i).locator('.info'), `control ${i}`).toHaveCount(1);
  }
  await expect(page.locator('#group-seafood').locator('..').locator('.info-tip')).toContainText(
    'Wild fish',
  );
});

test('a number of people on Earth can replace the UN projection', async ({ page }) => {
  await open(page);
  const follow = page.locator('[data-control="people"] .people-follow input');
  const slider = page.locator('#people');
  await expect(follow).toBeChecked();
  await expect(slider).toHaveCount(0);
  await expect(page).not.toHaveURL(/ppl=/);
  await expect(page.locator('label[for="option-population-low"]')).toHaveCount(1);
  const baseline = () => page.locator('.temperature-chart .baseline-line').getAttribute('d');
  const area = () => page.locator('.temperature-chart .population-area').getAttribute('d');
  await expect(page.locator('.population-chart')).toHaveCount(0);
  await expect(page.locator('.temperature-chart .key-population-area')).toBeVisible();
  await follow.uncheck();
  await expect(slider).toBeVisible();
  await expect(page).toHaveURL(/ppl=/);
  await expect(page.locator('label[for="option-population-low"]')).toHaveCount(0);
  const medium = page.locator('[data-control="people"] .people-marks button', {
    hasText: 'UN medium',
  });
  await expect(medium).toHaveAttribute('aria-pressed', 'true');
  await expect(slider).toHaveAttribute('aria-valuetext', /billion, UN medium$/);
  const [start, startArea] = [await baseline(), await area()];
  await slider.fill('0');
  await expect(page).toHaveURL(/ppl=0(&|$)/);
  await expect.poll(baseline).not.toBe(start);
  await expect.poll(area).not.toBe(startArea);
  await slider.focus();
  await page.keyboard.press('PageUp');
  await expect(slider).toHaveAttribute('aria-valuetext', /, UN low$/);
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuetext', /^\d+(\.\d)? billion$/);
  await medium.click();
  await expect(slider).toHaveAttribute('aria-valuetext', /billion, UN medium$/);
  await follow.check();
  await expect(slider).toHaveCount(0);
  await expect(page).not.toHaveURL(/ppl=/);
  await noHorizontalScroll(page);
});

test('the deep-time prototype opens from the footer, and each preset sets the axis', async ({
  page,
}) => {
  await open(page);
  const link = page.locator('.site-footer a[data-view="deeptime"]');
  await link.click();
  await expect(page).toHaveURL(/view=deeptime/);
  await expect(link).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.site-nav a[data-view="deeptime"]')).toHaveCount(0);
  const plot = page.locator('.deeptime-plot');
  const title = plot.locator('.deeptime-axis-title');
  await expect(plot.locator('[data-series="lgmr"]')).toBeAttached();
  await expect(plot.locator('[data-series="observed"]')).toBeAttached();
  const presets: [string, string][] = [
    ['cenozoic', 'Millions of years ago'],
    ['glacial', 'Thousands of years ago'],
    ['commonEra', 'Year'],
    ['industrial', 'Year'],
    ['phanerozoic', 'Millions of years ago'],
  ];
  for (const [preset, label] of presets) {
    const button = page.locator(`.deeptime-presets [data-preset="${preset}"]`);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(title).toHaveText(label);
  }
  await plot.focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.deeptime-presets [aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('.deeptime-rates [data-rate="observed"]')).toBeVisible();
  await expect(page.locator('.deeptime-offsets [data-offset="phanda"]')).toContainText('−14.46');
});

test('the card on what the warming means reads each source at both futures', async ({ page }) => {
  await open(page);
  const card = page.locator('.impacts-card');
  await expect(card.locator('h2')).toHaveText('What the warming means');
  // The fixtures' baseline lies above 2 °C, where SR1.5 and the heatwave study stop.
  const tiles = card.locator('.impact-tile');
  await expect(tiles).toHaveCount(6);
  await expect(tiles.first()).toHaveAttribute('data-row', 'extinction');
  // No lever is set yet: one figure a tile, and one warming beside the title.
  await expect(tiles.first()).not.toContainText('→');
  await expect(card.locator('.impacts-futures')).not.toContainText('with them');
  await expect(card.locator('.impact-tile[data-row="coral"]')).toContainText('≥ 99%');
  await card.locator('details > summary').click();
  const table = card.locator('.impacts-table');
  const groups = table.locator('.impact-group');
  await expect(groups).toHaveCount(4);
  await expect(groups.nth(0)).toHaveAttribute('data-group', 'wgi');
  await expect(groups.nth(3)).toHaveAttribute('data-group', 'heatwave');
  await expect(groups.nth(2).locator('.impact-levels')).toHaveText(
    'Assessed at 1.5 °C and 2 °C only',
  );
  const hot = table.locator('[data-row="hot10"] .impact-value');
  await expect(hot).toHaveCount(2);
  await expect(hot.first()).toContainText('×');
  await expect(table.locator('[data-row="coral"] .impact-value').first()).toHaveText('≥ 99%');
  await expect(table.locator('[data-row="heatwave"] .impact-value').first()).toContainText('≥');
  await table.locator('[data-row="hot10"] .info').click();
  await expect(table.locator('[data-row="hot10"] .info-tip')).toContainText(
    'IPCC range, 5–95% of the models',
  );
  await page.keyboard.press('Escape');
  await page.locator('label[for="horizon-2100"]').click();
  await expect(card.locator('.impacts-intro')).toContainText('around 2100');
  await quick(page, 'all', 'full').click();
  await expect(tiles.first()).toContainText('→');
  const extinction = table.locator('[data-row="extinction"] .impact-value');
  await expect(extinction.nth(1)).toHaveText('not assessed below 1.5 °C');
  await expect(extinction.nth(0)).toContainText('%');
});

/** Collapses a side menu by its button, checks it says so, and that a reload keeps it closed. */
const collapses = async (page: Page, menu: string, reload: () => Promise<void>) => {
  const toggle = page.locator(`[data-menu="${menu}"]`);
  const content = page.locator(`#${await toggle.getAttribute('aria-controls')}`);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAccessibleName(/^Hide /);
  await expect(content).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAccessibleName(/^Show /);
  await expect(content).toBeHidden();
  await noHorizontalScroll(page);
  await reload();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(content).toBeHidden();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(content).toBeVisible();
};

test('the Explore panel and summary collapse, and stay as left after a reload', async ({
  page,
}) => {
  await open(page);
  const reload = async () => {
    await page.reload();
    await expect(page.locator('main[data-ready]')).toBeAttached();
  };
  await collapses(page, 'panel', reload);
  await collapses(page, 'summary', reload);
  await expect(page.locator('[data-menu="panel"]')).toHaveAttribute(
    'aria-controls',
    'panel-content',
  );
});

/** A located element's top and bottom on the page, in pixels. */
const extent = async (page: Page, selector: string) => {
  const box = await page.locator(selector).boundingBox();
  return box ? { top: box.y, bottom: box.y + box.height } : { top: Infinity, bottom: Infinity };
};

test(
  'on a phone the panel opens collapsed, above the chart, with the horizon in the first screen',
  { tag: CLOSED_PANEL },
  async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the panel sits beside the chart on a desktop');
    await open(page);
    await expect(page.locator('#panel-content')).toBeHidden();
    await expect(page.locator('.panel .panel-horizon')).toBeVisible();
    const horizon = await extent(page, '.panel .panel-horizon');
    expect(horizon.bottom).toBeLessThan(page.viewportSize()?.height ?? 0);
    expect(horizon.top).toBeLessThan((await extent(page, '.chart-card')).top);
    const before = await page.locator('.summary .stat-hero').innerText();
    await page.locator('label[for="horizon-2100"]').click();
    await expect(page).toHaveURL(/to=2100/);
    await expect(page.locator('.summary .stat-hero')).not.toHaveText(before);
  },
);

test('a closed panel gives its room to the chart on a desktop', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the panel sits beside the chart on a desktop only');
  await open(page);
  const width = async () => (await page.locator('.chart-card').boundingBox())!.width;
  const before = await width();
  await page.locator('[data-menu="panel"]').click();
  await expect.poll(width).toBeGreaterThan(before + 200);
});

test('the menus speak French', async ({ page }) => {
  await open(page, `${START}&lang=fr`);
  await expect(page.locator('[data-menu="panel"]')).toHaveAccessibleName(
    'Masquer le scénario et les réglages',
  );
});

test('the Methodology contents open on a desktop, closed on a phone, and stay as left', async ({
  page,
  isMobile,
}) => {
  await page.goto(`${START}&view=methodology`);
  await expect(page.locator('.method-section').first()).toBeVisible();
  const list = page.locator('#toc-list');
  if (isMobile) {
    const toggle = page.locator('.toc-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(list).toBeHidden();
    await toggle.click();
    await page.reload();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(list).toBeVisible();
  } else {
    await collapses(page, 'toc', async () => {
      await page.reload();
    });
  }
  await noHorizontalScroll(page);
});

test('the deep-time markers and rates collapse, and stay as left', async ({ page, isMobile }) => {
  await open(page);
  await page.locator('.footer-links a[data-view="deeptime"]').click();
  await expect(page.locator('.deeptime-rates')).toBeVisible();
  const reload = async () => {
    await page.reload();
    await expect(page.locator('.deeptime-rates')).toBeVisible();
  };
  if (isMobile) {
    await expect(page.locator('[data-menu="markers"]')).toHaveAttribute('aria-expanded', 'false');
    await page.locator('[data-menu="markers"]').click();
  }
  await collapses(page, 'markers', reload);
  await collapses(page, 'rates', reload);
  await noHorizontalScroll(page);
});

test('an (i) button at the right of a phone keeps its popover wide and inside the screen', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'a phone');
  await open(page);
  const right = page.locator('.impacts-card .impact-tile .info').nth(1);
  await right.scrollIntoViewIfNeeded();
  const button = (await right.boundingBox())!;
  const width = page.viewportSize()!.width;
  expect(button.x).toBeGreaterThan(width * 0.6);
  for (let i = 0; i < 2; i++) {
    await right.click();
    const tip = page.locator('.info-tip[data-placed]:popover-open');
    await expect(tip).toBeVisible();
    const box = (await tip.boundingBox())!;
    expect(box.width).toBeGreaterThan(Math.min(300, width - 32) - 2);
    expect(box.x).toBeGreaterThanOrEqual(15);
    expect(box.x + box.width).toBeLessThanOrEqual(width - 15);
    await page.keyboard.press('Escape');
  }
});
