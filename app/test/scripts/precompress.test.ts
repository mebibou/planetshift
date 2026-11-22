import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync, brotliDecompressSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';

const SCRIPT = join(__dirname, '../../scripts/precompress.mjs');
const site = mkdtempSync(join(tmpdir(), 'precompress-'));
const long = (text: string) => text.repeat(200);
const FILES: Record<string, string> = {
  'index.html': long('<p>Planetshift</p>'),
  'assets/app.js': long('console.log(1);'),
  'assets/app.css': long('body{margin:0}'),
  'data/intensities.json': long('{"source":0},'),
  'icon.svg': long('<path d="M0 0"/>'),
  'notes.txt': long('not compressed'),
  'tiny.json': '{}',
};

describe('precompress', () => {
  Object.entries(FILES).forEach(([name, text]) => {
    mkdirSync(join(site, name, '..'), { recursive: true });
    writeFileSync(join(site, name), text);
  });
  execFileSync(process.execPath, [SCRIPT, site]);
  afterAll(() => rmSync(site, { recursive: true, force: true }));

  it.each(Object.keys(FILES).filter((f) => !['notes.txt', 'tiny.json'].includes(f)))(
    'writes %s.gz and .br, which decompress to the original',
    (name) => {
      const original = readFileSync(join(site, name));
      expect(gunzipSync(readFileSync(join(site, `${name}.gz`)))).toEqual(original);
      expect(brotliDecompressSync(readFileSync(join(site, `${name}.br`)))).toEqual(original);
    },
  );

  it('leaves other files, and copies no smaller than their original, alone', () => {
    ['notes.txt.gz', 'notes.txt.br', 'tiny.json.gz', 'tiny.json.br'].forEach((f) =>
      expect(existsSync(join(site, f)), f).toBe(false),
    );
  });

  it('does not compress its own output when run again', () => {
    execFileSync(process.execPath, [SCRIPT, site]);
    expect(existsSync(join(site, 'index.html.gz.gz'))).toBe(false);
  });
});
