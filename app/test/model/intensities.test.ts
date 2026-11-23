import { attempt } from '../../src/app/attempt';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeIntensities } from '../../src/data/load';
import type { Intensities, IntensitiesFile } from '../../src/data/types';

/** The last commit whose intensities.json repeats each source in its cells. */
const BEFORE_TABLE = '1580d3f';
const FILE = 'app/public/data/intensities.json';

const before = (): Intensities | null =>
  attempt(() => {
    const text = execFileSync('git', ['show', `${BEFORE_TABLE}:${FILE}`], {
      cwd: __dirname,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(text.toString('utf8')) as Intensities;
  }, null);

describe('intensities.json with a table of sources', () => {
  const old = before();
  it.skipIf(old === null)('decodes to the intensities written before the table', () => {
    const file = JSON.parse(
      readFileSync(join(__dirname, '../../..', FILE), 'utf8'),
    ) as IntensitiesFile;
    expect(new Set(file.sources).size).toBe(file.sources.length);
    expect(decodeIntensities(file)).toEqual(old);
  });
});
