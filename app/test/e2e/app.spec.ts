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
  dataCentres: ['iea', 'ssp'],
  permafrost: ['off', 'on'],
  population: ['medium', 'low', 'high'],
};

const FONT_HOSTS = /fonts\.(googleapis|gstatic)\.com/;
let errors: string[] = [];

const TOUR = '@tour';

test.beforeEach(async ({ page }, testInfo) => {
  errors = [];
  // The guided start opens on a first visit; every test but its own starts as a returning reader.
  if (!testInfo.tags.includes(TOUR)) {
    await page.context().addInitScript(() => localStorage.setItem('planetshift.tour', 'seen'));
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
  await page.locator('details[data-group="options"] > summary').click();
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
  await page.locator('details[data-group="options"] > summary').click();
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

test('Causes of warming shows the headline and the stacked warming chart', async ({ page }) => {
  await open(page);
  await expect(page.locator('.site-nav a')).toHaveCount(2);
  await page.locator('#chart-tab-cause').click();
  await expect(page).toHaveURL(/chart=cause/);
  await expect(page.locator('#chart-panel-cause')).toBeVisible();
  await expect(page.locator('#chart-panel-temperature')).toBeHidden();
  await expect(page.locator('.attribution-chart path.stack')).toHaveCount(6);
  await expect(page.locator('.attribution-chart .observed-line')).toHaveCount(1);
  await expect(page.locator('.attribution-chart .chart-legend')).toContainText(
    'Air pollution (cooling)',
  );
  await expect(page.locator('.attribution-chart .chart-legend')).toContainText(
    'Natural factors (sun and volcanoes)',
  );
  await expect(page.locator('.attribution-chart .stack-outline')).toHaveCount(0);
  await expect(page.locator('.gas-chart')).toHaveCount(0);
  await expect(page.locator('.headline')).toContainText('°C');
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
  await expect(page.locator('.attribution-chart path.stack')).toHaveCount(3);
  await expect(page.locator('.attribution-chart .observed-line')).toHaveCount(0);
  await expect(legend).toContainText('Other sources and interactions');
  await expect(legend).not.toContainText('Air pollution');
  await expect(legend).not.toContainText('Land use');
  await expect(page.locator('.cause-view .chart-subtitle')).toContainText('methane');
  await noHorizontalScroll(page);

  await page.locator('#causegas-ch4').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/causegas=n2o/);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/causegas=co2/);
  await expect(page.locator('.attribution-chart path.stack')).toHaveCount(4);
  await expect(legend).toContainText('Land use');

  await page.reload();
  await expect(page.locator('#causegas-co2')).toBeChecked();
  await expect(page.locator('.attribution-chart path.stack')).toHaveCount(4);
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
    'Autres sources et interactions',
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
  await expect(page.locator('.attribution-chart path.stack')).toHaveCount(6);
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
    'quality',
    'change',
  ]) {
    await page.locator(`label[for="layer-${layer}"]`).click();
    await expect(page).toHaveURL(
      layer === 'change' ? /^(?!.*layer=)/ : new RegExp(`layer=${layer}`),
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
  const before = { fills: await fills(), top: await lastY(page, '.avoided-chart .scenario-line') };
  await openDiet(page);
  await page.locator('#shift').fill('80');
  await expect(page).toHaveURL(/shift=80/);
  await expect.poll(fills).not.toBe(before.fills);
  expect(await lastY(page, '.avoided-chart .scenario-line')).not.toBe(before.top);
});

test('the charts are tabs, global temperature first, and reach 2100', async ({ page }) => {
  await open(page, `${START}&shift=50`);
  await expect(page.locator('#chart-tab-temperature')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#chart-panel-temperature')).toBeVisible();
  await expect(page.locator('#chart-panel-avoided')).toBeHidden();
  const legend = page.locator('.temperature-chart > .chart-legend');
  await expect(legend).toContainText('Without the levers');
  await expect(legend).toContainText('With the levers');
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
  await expect(page.locator('#chart-tab-avoided')).toBeFocused();
  await expect(page.locator('#chart-tab-avoided')).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/chart=avoided/);
  await page.keyboard.press('End');
  await expect(page.locator('#chart-tab-cause')).toBeFocused();
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
  await open(page, `${START}&shift=50`);
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
  await page.locator('details[data-group="options"] > summary').click();
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

test('the data-centre and permafrost options move the baseline', async ({ page }) => {
  await open(page);
  await page.locator('details[data-group="options"] > summary').click();
  await page.locator('label[for="horizon-2100"]').click();
  // The axis rescales with the curve, so compare the drawn path, not its end in pixels.
  const baseline = () => page.locator('.temperature-chart .baseline-line').getAttribute('d');
  const start = await baseline();
  await page.locator('label[for="option-permafrost-on"]').click();
  await expect(page).toHaveURL(/pf=on/);
  await expect.poll(baseline).not.toBe(start);
  await page.locator('label[for="option-permafrost-off"]').click();
  await expect(page).not.toHaveURL(/pf=/);
  await expect.poll(baseline).toBe(start);
  await page.locator('label[for="option-dataCentres-ssp"]').click();
  await expect(page).toHaveURL(/dc=ssp/);
  await expect.poll(baseline).not.toBe(start);
});

test('the population option moves the baseline and the projection the chart highlights', async ({
  page,
}) => {
  await open(page);
  const people = page.locator('.population-chart');
  const chosen = people.locator('.population-variant.is-chosen');
  await expect(people.locator('.population-history')).toHaveCount(1);
  await expect(people.locator('.population-variant')).toHaveCount(3);
  await expect(chosen).toHaveAttribute('data-variant', 'medium');
  await page.locator('details[data-group="options"] > summary').click();
  await page.locator('label[for="horizon-2100"]').click();
  const baseline = () => page.locator('.temperature-chart .baseline-line').getAttribute('d');
  const start = await baseline();
  await page.locator('label[for="option-population-low"]').click();
  await expect(page).toHaveURL(/pop=low/);
  await expect(chosen).toHaveAttribute('data-variant', 'low');
  await expect.poll(baseline).not.toBe(start);
  const note = people.locator('.population-note');
  await expect(note).toHaveText(
    /^With this projection, the warming without the levers in 2100 moves by −\d[.\d]*.°C from the medium projection's\.$/,
  );
  await page.locator('label[for="option-ssp-ssp370"]').click();
  await expect(people.locator('.population-note')).toContainText('SSP3-7.0');
  await expect(people.locator('.population-note')).toContainText('moves by');
  await page.locator('label[for="option-population-medium"]').click();
  await expect(page).not.toHaveURL(/pop=/);
  await expect(people.locator('.population-note')).toBeHidden();
  await noHorizontalScroll(page);
});

test('the population chart follows the temperature chart’s hover year, and back', async ({
  page,
}) => {
  await open(page);
  const temperature = page.locator('.temperature-chart > .chart-plot');
  const people = page.locator('.population-chart .chart-plot');
  const target = temperature.locator('.hover-target');
  await target.hover();
  const year = await temperature.locator('.chart-tooltip strong').innerText();
  await expect(people.locator('.chart-tooltip strong')).toHaveText(year);
  await expect(people.locator('.crosshair')).not.toHaveCSS('display', 'none');
  await page.mouse.move(0, 0);
  await expect(people.locator('.chart-tooltip')).toBeHidden();
  const own = people.locator('.hover-target');
  const box = await own.boundingBox();
  await own.hover({ position: { x: (box?.width ?? 0) / 4, y: (box?.height ?? 0) / 2 } });
  const other = await people.locator('.chart-tooltip strong').innerText();
  await expect(temperature.locator('.chart-tooltip strong')).toHaveText(other);
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
  await expect(groups).toHaveCount(8);
  for (const id of [
    'diet',
    ...['practices', 'waste', 'deforestation', 'removals', 'energy', 'industry'].map(
      (m) => `levers-${m}`,
    ),
  ]) {
    await expect(page.locator(`details[data-group="${id}"]`)).not.toHaveAttribute('open');
  }
  await expect(page.locator('details[data-group="options"]')).not.toHaveAttribute('open');
  const time = page.locator('.panel > *').first();
  await expect(time).toHaveClass('time-settings');
  await expect(time.locator('> *').first()).toHaveAttribute('data-control', 'timing');
  await expect(time.locator('> *').nth(1)).toHaveAttribute('data-control', 'horizon');
  await expect(time).toContainText('Results up to');
  await expect(page.locator('.panel > details.group').last()).toHaveAttribute(
    'data-group',
    'options',
  );
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
  await expect(meta('options')).toHaveText('All at their defaults');
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
  await page.locator('details[data-group="options"] > summary').click();
  await page.locator('label[for="option-ssp-ssp126"]').click();
  await expect(meta('options')).toHaveText('Changed: 1');
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
  await expect(page.locator('.worth-legend')).toContainText('2100');
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

test('the chart opens the page and comes before the controls in the reading order', async ({
  page,
}) => {
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
        .querySelector('.chart-card')!
        .compareDocumentPosition(document.querySelector('.panel')!),
    ),
  ).toBe(4);
  const panel = await box('.panel');
  if (page.viewportSize()!.width <= 860) {
    expect(panel.top).toBeGreaterThanOrEqual(chart.bottom);
  } else {
    expect(panel.top).toBeLessThan(chart.bottom);
  }
});

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
  expect(map.name).toMatch(/^planetshift-map-change-emissions-co2e-shift50-\d{4}\.csv$/);
  expect(map.text.startsWith('﻿iso3,country,layer,measure,')).toBe(true);
  expect(map.text.trimEnd().split('\r\n')).toHaveLength(6);
  const chart = await readDownload(page, chartFormat(page, 'csv'));
  expect(chart.name).toMatch(/^planetshift-temperature-shift50-\d{4}\.csv$/);
  expect(chart.text.startsWith('﻿year,observed_degC,')).toBe(true);
  const scenario = await readDownload(page, () => page.locator('.download-scenario').click());
  expect(JSON.parse(scenario.text)).toMatchObject({ app: 'Planetshift', scenario: { shift: 0.5 } });
  await page.locator('.download-files summary').click();
  await expect(page.locator('.file-list a[href="fixtures/climate.json"]')).toBeVisible();
  await expect(page.locator('.file-list li', { hasText: 'climate.json' })).toContainText(
    'CC BY-NC-SA 4.0',
  );
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
  await expect(page.locator('details[data-group="options"] .quick')).toHaveCount(0);
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

test('the footer links to the licences and the source, and a link’s language wins', async ({
  page,
}) => {
  await open(page);
  const links = page.locator('.footer-links a');
  await expect(links).toHaveCount(3);
  await expect(links.last()).toHaveAttribute('href', /github\.com\/.+\/planetshift$/);
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

test('behind ?popctl=people, a number of people on Earth replaces the UN projection', async ({
  page,
}) => {
  await open(page);
  await expect(page.locator('[data-control="people"]')).toHaveCount(0);
  await open(page, `${START}&popctl=people`);
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
  await expect(page).toHaveURL(/popctl=people/);
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

test('behind ?popctl=lever, education and voluntary family planning is a lever', async ({
  page,
}) => {
  await open(page, `${START}&fp=50`);
  await expect(page.locator('#lever-familyPlanning')).toHaveCount(0);
  await expect(page).not.toHaveURL(/fp=/);
  await open(page, `${START}&popctl=lever&to=2100`);
  const fold = page.locator('details[data-group="levers-population"]');
  await fold.locator('summary').click();
  const slider = page.locator('#lever-familyPlanning');
  await expect(slider).toBeVisible();
  await slider.fill('100');
  await expect(page).toHaveURL(/fp=100/);
  await expect(page).toHaveURL(/popctl=lever/);
  await expect(page.locator('.gap-annotation text')).toContainText('−');
  await page.locator('[data-lever="familyPlanning"] button.info').click();
  await expect(page.locator('[data-lever="familyPlanning"] .info-tip')).toContainText(
    'voluntary family planning',
  );
  await page.keyboard.press('Escape');
  await page.locator('details[data-group="options"] > summary').click();
  await page.locator('label[for="option-population-low"]').click();
  await expect(slider).toBeDisabled();
  await expect(page.locator('[data-lever="familyPlanning"] .lever-foot')).toContainText(
    'low projection',
  );
  await noHorizontalScroll(page);
});
