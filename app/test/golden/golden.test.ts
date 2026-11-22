import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ModelData } from '../../src/data/types';
import { DEFAULT_OPTIONS } from '../../src/model/api';
import { runScenario } from '../../src/model/run';
import { decodeState, encodeState } from '../../src/model/state';
import { CURRENT_YEAR, loadFixtures } from '../model/fixtures';
import { loadRealData } from '../model/realData';
import { GRID, QUERIES } from './grid';
import { rounded, snapshot } from './snapshot';

// `npm run golden` rewrites the files; otherwise every result must equal its golden.
const UPDATE = process.env.UPDATE_GOLDEN === '1';
const path = (name: string) => join(__dirname, `${name}.json`);

/** One entry per line, so a change shows as the lines of the settings it touches. */
const write = (name: string, entries: Record<string, unknown>) =>
  writeFileSync(
    path(name),
    `{\n${Object.entries(entries)
      .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
      .join(',\n')}\n}\n`,
  );

const read = (name: string): Record<string, unknown> =>
  existsSync(path(name)) ? JSON.parse(readFileSync(path(name), 'utf8')) : {};

const record = (data: ModelData, countries: readonly string[]) =>
  Object.fromEntries(
    GRID.map((s) => [
      s.id,
      snapshot(
        runScenario(data, s.scenario, { ...DEFAULT_OPTIONS, ...s.options }, CURRENT_YEAR),
        countries,
      ),
    ]),
  );

const check = (name: string, actual: Record<string, unknown>) => {
  if (UPDATE) write(name, actual);
  const expected = read(name);
  expect(Object.keys(actual)).toEqual(Object.keys(expected));
  Object.keys(expected).forEach((id) => expect(actual[id], id).toEqual(expected[id]));
};

const urls = () => ({
  ...Object.fromEntries(
    GRID.map((s) => {
      const options = { ...DEFAULT_OPTIONS, ...s.options };
      const query = encodeState(s.scenario, options);
      return [`encode:${s.id}`, { query, decoded: rounded(decodeState(query)) }];
    }),
  ),
  ...Object.fromEntries(QUERIES.map((q) => [`decode:${q}`, rounded(decodeState(q))])),
});

describe('goldens', () => {
  it('the fixtures give the recorded results', () =>
    check('fixtures', record(loadFixtures(), ['FRA', 'IND', 'BRA'])));

  const real = loadRealData();
  it.skipIf(real === null)('the real data give the recorded results', () =>
    check('real', record(real as ModelData, ['FRA', 'IND', 'BRA'])),
  );

  it('the URL state round-trips as recorded', () => check('urls', urls()));
});
