// Writes the fully drawn HTML of each entry page into dist/, after `vite build`, so search
// engines and link previews read the page's text without running the app: Explore and the
// Methodology, in English and in French. The app takes over when it starts (src/main.tsx).
//
//   node scripts/prerender.mjs [dist]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const dist = process.argv[2] ?? 'dist';

/** Each entry page: its path under the site's root, the view and the language it shows. */
const PAGES = [
  { path: '', view: 'explore', lang: 'en' },
  { path: 'methodology/', view: 'methodology', lang: 'en' },
  { path: 'fr/', view: 'explore', lang: 'fr' },
  { path: 'fr/methodology/', view: 'methodology', lang: 'fr' },
];

/** What shows the page is drawn: the summary's figure, or the Methodology's sections. */
const READY = {
  explore: '.summary .stat-hero .stat-value',
  methodology: '.method-section',
};

/** Every lever in full, so the share image shows the two futures apart. */
const EVERY_LEVER =
  'shift=50&with=legumes&fa=100&bf=100&mm=100&rw=100&ne=100&ni=100&fe=100&fw=100&sl=100&df=100' +
  '&cc=100&af=100&bc=100&ew=100&ev=100&et=100&fl=100&saf=100&cs=100&re=100&cdc=100';

const texts = async (lang) =>
  JSON.parse(await readFile(new URL(`../src/i18n/${lang}.json`, import.meta.url), 'utf8'));

const escape = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** The Planetshift mark, as in the header. */
const MARK = `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#cfe4ee"/><g fill="#3f9a5f"><path d="M1 7c2-3 7-4 10-2s3 4 1 6-1 5-4 5-3-1-4-3-4-4-3-6z"/><path d="M7 17c2-1 5 0 5 3s-1 6-3 8-3-2-3-5 0-5 1-6z"/><path d="M15 5c4-3 11-3 14 0s2 6-1 7-5 0-7 2-5 1-6-2 0-5 0-7z"/><path d="M18 15c3-1 6 0 6 3s-2 5-3 7-3-1-3-4-1-4 0-6z"/><path d="M25 21c2-1 5 0 5 2s-2 3-3 3-3-1-2-5z"/></g><circle cx="16" cy="16" r="14" fill="none" stroke="#1d5a3a" stroke-width="1.5"/></svg>`;

/** The share image's page: the name, the question, what the site shows, and the chart. */
const cardHtml = (t, chart, host) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap">
<style>
  body { margin: 0; width: 1200px; height: 630px; background: #f2f4f1; color: #17241e;
    font-family: Lato, system-ui, sans-serif; display: grid; grid-template-columns: 500px 1fr; }
  .text { padding: 64px 24px 56px 64px; display: flex; flex-direction: column; gap: 22px; }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 40px; font-weight: 900; }
  .brand svg { width: 60px; height: 60px; }
  h1 { margin: 18px 0 0; font-size: 46px; line-height: 1.1; font-weight: 900; }
  p { margin: 0; font-size: 25px; line-height: 1.4; color: #55635c; }
  .host { margin-top: auto; font-size: 21px; font-weight: 700; color: #2f6b4f; }
  .chart { margin: 48px 48px 48px 0; padding: 28px 24px 20px; background: #fff;
    border: 1px solid #d3dad5; border-radius: 22px; display: flex; flex-direction: column; gap: 14px; }
  .chart img { width: 100%; flex: 1; object-fit: contain; min-height: 0; }
  .keys { display: flex; gap: 24px; font-size: 19px; color: #55635c; }
  .keys span::before { content: ''; display: inline-block; width: 22px; height: 4px; margin: 0 8px 5px 0;
    border-radius: 2px; vertical-align: middle; background: var(--c); }
</style></head><body>
<div class="text">
  <div class="brand">${MARK}Planetshift</div>
  <h1>${escape(t.header.tagline)}</h1>
  <p>${escape(t.share.subtitle)}</p>
  <div class="host">${escape(host)}</div>
</div>
<div class="chart">
  <img src="data:image/png;base64,${chart}" alt="">
  <div class="keys"><span style="--c:#7a817d">${escape(t.chart.baseline)}</span><span style="--c:#2a78d6">${escape(t.share.withAll)}</span></div>
</div>
</body></html>`;

/** The share image in a language: the temperature chart with every lever, set in its card. */
const shareImage = async (browser, origin, site, lang) => {
  // A page about as wide as the card's chart, drawn at twice the density so it stays sharp.
  const context = await browser.newContext({
    viewport: { width: 1000, height: 900 },
    deviceScaleFactor: 2,
  });
  const tab = await context.newPage();
  await tab.goto(`${origin}/?${EVERY_LEVER}&to=2100&lang=${lang}&tour=0`);
  await tab.locator(READY.explore).waitFor({ timeout: 60_000 });
  await tab.waitForLoadState('networkidle');
  const plot = tab.locator('.temperature-chart > .chart-plot').first();
  const chart = (await plot.screenshot()).toString('base64');
  await context.close();
  const url = new URL(site);
  const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await card.setContent(
    cardHtml(await texts(lang), chart, url.host + url.pathname.replace(/\/$/, '')),
  );
  await card.waitForLoadState('networkidle');
  const png = await card.screenshot({ type: 'png' });
  await card.close();
  return png;
};

/** The image a page shares: its language's. */
const imageOf = (site, page) => `${site}share-${page.lang}.png`;

const rootOf = (path) => '../'.repeat(path.split('/').filter(Boolean).length);

/** The same view in the other language. */
const twin = (page, lang) => PAGES.find((p) => p.view === page.view && p.lang === lang);

/** The page's head made its own: its canonical URL, its languages and how to find the root. */
const headOf = (site, page) => {
  // The root page names no language, so a reader's own choice comes first there.
  const entry = JSON.stringify({
    view: page.view,
    ...(page.path ? { lang: page.lang } : {}),
    root: rootOf(page.path),
  });
  const alternates = ['en', 'fr']
    .map((l) => `<link rel="alternate" hreflang="${l}" href="${site}${twin(page, l).path}">`)
    .join('');
  return (
    `<meta name="planetshift:entry" content='${entry}'>` +
    `<link rel="canonical" href="${site}${page.path}">` +
    alternates +
    `<link rel="alternate" hreflang="x-default" href="${site}${twin(page, 'en').path}">` +
    `<meta property="og:image" content="${imageOf(site, page)}">` +
    `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">` +
    `<meta property="og:image:alt" content="${page.alt}">` +
    `<meta property="og:locale" content="${page.lang === 'fr' ? 'fr_FR' : 'en_GB'}">`
  );
};

/** The drawn page, its state left out and its links made relative to where it is written. */
const capture = async (browser, origin, site, page) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const tab = await context.newPage();
  await tab.goto(`${origin}/?view=${page.view}&lang=${page.lang}&tour=0`);
  await tab.locator(READY[page.view]).first().waitFor({ timeout: 60_000 });
  await tab.waitForLoadState('networkidle');
  const html = await tab.evaluate(() => {
    const root = document.documentElement;
    root.removeAttribute('style');
    // Set once the app has drawn its first result: the tests wait for it, not for the snapshot.
    document.querySelector('main')?.removeAttribute('data-ready');
    root.removeAttribute('data-theme');
    document
      .querySelectorAll('link[rel="canonical"], link[rel="alternate"]')
      .forEach((l) => l.remove());
    document
      .querySelectorAll(
        'meta[property="og:url"], meta[property^="og:image"], meta[property="og:locale"]',
      )
      .forEach((m) => m.remove());
    // The map's countries are most of the page's weight and no text: the app draws them.
    document.querySelectorAll('svg.map-svg').forEach((svg) => svg.remove());
    return `<!doctype html>\n${root.outerHTML}`;
  });
  await context.close();
  const up = rootOf(page.path);
  return html
    .replaceAll(`${origin}/`, `./${up}`)
    .replaceAll('"./assets/', `"${up}assets/`)
    .replace(
      '</head>',
      `${headOf(site, page)}<meta property="og:url" content="${site}${page.path}"></head>`,
    );
};

const source = await readFile(join(dist, 'index.html'), 'utf8');
const site = /<link rel="canonical" href="([^"]+)"/.exec(source)?.[1];
if (!site) {
  throw new Error('index.html has no canonical link to take the site URL from');
}

const server = await preview({
  build: { outDir: dist },
  preview: { port: 4181, strictPort: true },
});
const origin = 'http://localhost:4181';
const browser = await chromium.launch();
try {
  // Every page is drawn from the plain index.html before any is written over it.
  const pages = [];
  for (const lang of ['en', 'fr']) {
    await writeFile(join(dist, `share-${lang}.png`), await shareImage(browser, origin, site, lang));
    console.log(`share image share-${lang}.png`);
  }
  for (const page of PAGES) {
    const withAlt = { ...page, alt: escape((await texts(page.lang)).share.alt) };
    pages.push({ page, html: await capture(browser, origin, site, withAlt) });
  }
  for (const { page, html } of pages) {
    const file = join(dist, page.path, 'index.html');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html);
    console.log(`prerendered ${page.path || '/'} (${(html.length / 1024).toFixed(0)} kB)`);
  }
} finally {
  await browser.close();
  await server.close();
}
