import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const SCRIPT = join(__dirname, '../../scripts/sw.mjs');
const page = (text: string) => `<!doctype html><html><head></head><body>${text}</body></html>`;
const FILES: Record<string, string> = {
  'index.html': page('Explore'),
  'fr/index.html': page('Explorer'),
  'methodology/index.html': page('Methodology'),
  'assets/index-abc.js': 'console.log(1);',
  'assets/index-abc.css': 'body{margin:0}',
  'assets/lato-latin-400-normal-abc.woff2': 'woff2',
  'assets/KaTeX_Main-Regular-abc.woff': 'woff',
  'assets/KaTeX_Main-Regular-abc.ttf': 'ttf',
  'data/meta.json': '{"baseYear":2022}',
  'data/breakdown.json': '{}',
  'data/deeptime.json': '[]',
  'fixtures/meta.json': '{"baseYear":2000}',
  'manifest.webmanifest': '{}',
  'icons/icon-192.png': 'png',
  'share-en.png': 'png',
  'data/meta.json.gz': 'gz',
};

const build = () => {
  const site = mkdtempSync(join(tmpdir(), 'sw-'));
  Object.entries(FILES).forEach(([name, text]) => {
    mkdirSync(join(site, name, '..'), { recursive: true });
    writeFileSync(join(site, name), text);
  });
  execFileSync(process.execPath, [SCRIPT, site]);
  return site;
};

const manifestOf = (site: string) => {
  const line = readFileSync(join(site, 'sw.js'), 'utf8').split('\n')[0] ?? '';
  return JSON.parse(line.replace('self.__PLANETSHIFT__ = ', '').replace(/;$/, '')) as {
    version: string;
    precache: Record<string, string>;
    runtime: Record<string, string>;
  };
};

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('base64');

describe('the service worker', () => {
  const site = build();
  const again = build();
  afterAll(() => [site, again].forEach((s) => rmSync(s, { recursive: true, force: true })));
  const { version, precache, runtime } = manifestOf(site);

  it('caches the pages, the shell and the data Explore opens with on the first visit', () => {
    expect(Object.keys(precache).sort()).toEqual([
      '',
      'assets/index-abc.css',
      'assets/index-abc.js',
      'assets/lato-latin-400-normal-abc.woff2',
      'data/breakdown.json',
      'data/meta.json',
      'fr/',
      'icons/icon-192.png',
      'manifest.webmanifest',
      'methodology/',
    ]);
  });

  it('keeps the other data files once they are first fetched', () => {
    expect(Object.keys(runtime).sort()).toEqual(['data/deeptime.json', 'fixtures/meta.json']);
  });

  it("names the build's version in each page, and hashes the page as served", () => {
    const html = readFileSync(join(site, 'fr/index.html'));
    expect(html.toString()).toContain(`<meta name="planetshift:build" content="${version}">`);
    expect(precache['fr/']).toBe(sha256(html));
    expect(precache['data/meta.json']).toBe(sha256(Buffer.from(FILES['data/meta.json'] ?? '')));
  });

  it('gives the same build the same version, and writes its version once', () => {
    expect(manifestOf(again).version).toBe(version);
    execFileSync(process.execPath, [SCRIPT, again]);
    expect(manifestOf(again).version).toBe(version);
    const html = readFileSync(join(again, 'index.html'), 'utf8');
    expect(html.match(/planetshift:build/g)).toHaveLength(1);
  });

  it('gives a build with other data another version', () => {
    writeFileSync(join(again, 'data/deeptime.json'), '[1]');
    execFileSync(process.execPath, [SCRIPT, again]);
    expect(manifestOf(again).version).not.toBe(version);
  });
});
