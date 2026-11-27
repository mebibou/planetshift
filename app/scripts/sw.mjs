// Writes sw.js, the service worker that keeps the site working offline, into a built and
// pre-rendered site, and names the build's version in each page. The app shell, the pages and the
// data Explore opens with are cached on the first visit; the other data files when first fetched.
//
//   node scripts/sw.mjs [dist]

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const PAGES = ['', 'methodology/', 'fr/', 'fr/methodology/'];
const SHELL = /^(assets\/.+\.(js|css|woff2)|manifest\.webmanifest|icons\/.+\.png)$/;
const DATA = /^(data|fixtures)\/[^/]+\.json$/;
// Explore fetches breakdown.json once its first result shows, before the worker can keep a copy.
const ON_FIRST_FETCH = new Set(['data/deeptime.json']);
const BUILD_META = /<meta name="planetshift:build" content="[^"]*">/g;

const folder = process.argv[2] ?? 'dist';

const filesIn = (dir) =>
  readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile())
    .map((e) => relative(dir, join(e.parentPath, e.name)).split(sep).join('/'));

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('base64');
const hashes = (paths, read) => Object.fromEntries(paths.map((p) => [p, sha256(read(p))]));
const readFile = (path) => readFileSync(join(folder, path));
const pageFile = (page) => join(folder, page, 'index.html');

const files = filesIn(folder);
const atFirstVisit = files.filter(
  (f) => SHELL.test(f) || (f.startsWith('data/') && DATA.test(f) && !ON_FIRST_FETCH.has(f)),
);
const onFirstFetch = files.filter((f) => DATA.test(f) && !atFirstVisit.includes(f));
const pages = PAGES.filter((p) => existsSync(pageFile(p)));
const html = Object.fromEntries(
  pages.map((p) => [p, readFileSync(pageFile(p), 'utf8').replaceAll(BUILD_META, '')]),
);

const assets = hashes(atFirstVisit, readFile);
const runtime = hashes(onFirstFetch, readFile);
const version = createHash('sha256')
  .update(
    JSON.stringify([assets, runtime, hashes(pages, (p) => html[p])].map(Object.entries).flat()),
  )
  .digest('hex')
  .slice(0, 16);

const marked = Object.fromEntries(
  pages.map((p) => [
    p,
    html[p].replace('</head>', `<meta name="planetshift:build" content="${version}"></head>`),
  ]),
);
pages.forEach((p) => writeFileSync(pageFile(p), marked[p]));

const precache = { ...hashes(pages, (p) => marked[p]), ...assets };
const template = readFileSync(new URL('./sw-template.js', import.meta.url), 'utf8');
writeFileSync(
  join(folder, 'sw.js'),
  `self.__PLANETSHIFT__ = ${JSON.stringify({ version, precache, runtime })};\n${template}`,
);

const size = (paths) => paths.reduce((sum, p) => sum + readFileSync(join(folder, p)).length, 0);
const precached = [...pages.map((p) => join(p, 'index.html')), ...atFirstVisit];
console.log(
  `sw.js ${version}: ${precached.length} files cached on the first visit ` +
    `(${(size(precached) / 1e6).toFixed(1)} MB), ${onFirstFetch.length} when first fetched ` +
    `(${(size(onFirstFetch) / 1e6).toFixed(1)} MB)`,
);
