import { describe, expect, it } from 'vitest';
import type { LayerSpec } from '../../src/map/layers';
import {
  filterRows,
  fold,
  nextSort,
  pageOf,
  sortRows,
  tableRows,
  type TableRow,
} from '../../src/map/table';
import { sourceInText } from '../../src/map/sources';
import { countryResult } from './fakes';

const spec = (over: Partial<LayerSpec> = {}): LayerSpec => ({
  layer: 'production',
  changeOf: 'production',
  group: 'all',
  gas: 'co2e',
  ...over,
});

const row = (over: Partial<TableRow>): TableRow => ({
  iso3: 'X',
  name: 'X',
  names: ['X'],
  before: 1,
  after: 1,
  change: 0,
  tier: null,
  source: null,
  beyond: {
    chainBefore: null,
    chainAfter: null,
    clearingBefore: null,
    clearingAfter: null,
    drainedBefore: null,
    drainedAfter: null,
  },
  ...over,
});

const NAMES = {
  FRA: ['France', 'France'],
  CIV: ["Côte d'Ivoire", "Côte d'Ivoire"],
  DEU: ['Germany', 'Allemagne'],
};
const namesOf = (iso3: string) => ({
  name: NAMES[iso3 as keyof typeof NAMES]?.[0] ?? iso3,
  names: [...(NAMES[iso3 as keyof typeof NAMES] ?? []), iso3],
});

describe('table rows', () => {
  it('gives each country its values before and after, the change, tier and source', () => {
    const [r] = tableRows([countryResult()], spec(), namesOf, () => ({
      tier: 5,
      source: 'https://hestia.earth/x',
    }));
    expect(r).toEqual({
      iso3: 'FRA',
      name: 'France',
      names: ['France', 'France', 'FRA'],
      before: 110,
      after: 125,
      change: 15 / 110,
      tier: 5,
      source: 'https://hestia.earth/x',
      beyond: {
        chainBefore: null,
        chainAfter: null,
        clearingBefore: null,
        clearingAfter: null,
        drainedBefore: null,
        drainedAfter: null,
      },
    });
  });

  it('falls back to the result’s tier, and leaves farmland and clearing without one', () => {
    const [r] = tableRows([countryResult()], spec({ layer: 'emissions' }), namesOf, () => null);
    expect(r).toMatchObject({ tier: 3, source: 'https://www.fao.org/faostat/en/#data/GLE' });
    const [land] = tableRows([countryResult()], spec({ layer: 'land' }), namesOf, () => null);
    expect(land).toMatchObject({
      before: 0.2,
      after: expect.closeTo(0.16),
      change: expect.closeTo(-0.2),
      tier: null,
      source: null,
    });
  });

  it('has no change when there was nothing before', () => {
    const [r] = tableRows([countryResult()], spec({ layer: 'deforestation' }), namesOf, () => null);
    expect(r?.change).toBeNull();
  });

  it('lists only the countries with farmed mammals and a land area, without a tier', () => {
    const rows = tableRows(
      [
        countryResult({ mammals: 1e6, mammalsChange: -5e5 }),
        countryResult({ iso3: 'USA', mammals: 0 }),
        countryResult({ iso3: 'DEU', landArea: 0 }),
      ],
      spec({ layer: 'mammals' }),
      namesOf,
      () => ({ tier: 3, source: 'x' }),
    );
    expect(rows.map((r) => [r.iso3, r.before, r.after, r.change, r.tier])).toEqual([
      ['FRA', 1e6 / 50, 5e5 / 50, -0.5, null],
    ]);
  });

  it('lists only the countries with land-use data, today and with the levers', () => {
    const rows = tableRows(
      [countryResult(), countryResult({ iso3: 'USA' })],
      spec({ layer: 'landCo2' }),
      namesOf,
      () => null,
      new Map([['FRA', -2e9]]),
    );
    expect(rows.map((r) => [r.iso3, r.before, r.tier])).toEqual([['FRA', -2e9, null]]);
  });
});

describe('table search', () => {
  const rows = ['FRA', 'CIV', 'DEU'].map((iso3) => row({ iso3, ...namesOf(iso3) }));

  it('matches either language and the ISO code, ignoring case and accents', () => {
    expect(fold('  Côte ')).toBe('cote');
    expect(filterRows(rows, 'allem').map((r) => r.iso3)).toEqual(['DEU']);
    expect(filterRows(rows, 'COTE').map((r) => r.iso3)).toEqual(['CIV']);
    expect(filterRows(rows, 'fra').map((r) => r.iso3)).toEqual(['FRA']);
    expect(filterRows(rows, '   ')).toHaveLength(3);
    expect(filterRows(rows, 'zzz')).toEqual([]);
  });
});

describe('table sort', () => {
  const rows = [
    row({ iso3: 'A', name: 'Brazil', after: 5, change: null }),
    row({ iso3: 'B', name: 'Angola', after: 9, change: 0.1 }),
    row({ iso3: 'C', name: 'Chad', after: 5, change: -0.3 }),
  ];
  const ids = (r: TableRow[]) => r.map((x) => x.iso3).join('');

  it('sorts numbers either way, ties by name', () => {
    expect(ids(sortRows(rows, { column: 'after', direction: 'descending' }, 'en'))).toBe('BAC');
    expect(ids(sortRows(rows, { column: 'after', direction: 'ascending' }, 'en'))).toBe('ACB');
  });

  it('puts a missing value last whichever the direction', () => {
    expect(ids(sortRows(rows, { column: 'change', direction: 'descending' }, 'en'))).toBe('BCA');
    expect(ids(sortRows(rows, { column: 'change', direction: 'ascending' }, 'en'))).toBe('CBA');
  });

  it('sorts names in the reader’s language', () => {
    expect(ids(sortRows(rows, { column: 'name', direction: 'ascending' }, 'en'))).toBe('BAC');
    const accents = [row({ iso3: 'E', name: 'Égypte' }), row({ iso3: 'F', name: 'Finlande' })];
    expect(ids(sortRows(accents, { column: 'name', direction: 'ascending' }, 'fr'))).toBe('EF');
  });

  it('reverses on a second click and starts a new column in its natural order', () => {
    const current = { column: 'after', direction: 'descending' } as const;
    expect(nextSort(current, 'after')).toEqual({ column: 'after', direction: 'ascending' });
    expect(nextSort(current, 'name')).toEqual({ column: 'name', direction: 'ascending' });
    expect(nextSort(current, 'change')).toEqual({ column: 'change', direction: 'descending' });
  });
});

describe('table pages', () => {
  const rows = Array.from({ length: 45 }, (_, i) => i);

  it('shows one page at a time with its position', () => {
    expect(pageOf(rows, 1, 20)).toMatchObject({ page: 1, pages: 3, from: 1, to: 20, total: 45 });
    const last = pageOf(rows, 3, 20);
    expect(last).toMatchObject({ page: 3, from: 41, to: 45 });
    expect(last.rows).toEqual([40, 41, 42, 43, 44]);
  });

  it('clamps a page out of range', () => {
    expect(pageOf(rows, 9, 20).page).toBe(3);
    expect(pageOf(rows, 0, 20).page).toBe(1);
    expect(pageOf(rows, Number.NaN, 20).page).toBe(1);
  });

  it('has one empty page when nothing matches', () => {
    expect(pageOf([], 2, 20)).toEqual({ rows: [], page: 1, pages: 1, from: 0, to: 0, total: 0 });
  });
});

describe('table sources', () => {
  it('shortens a source that holds an address and keeps a plain one', () => {
    expect(sourceInText('proxy 2511: https://hestia.earth/cycle/x')).toEqual({
      label: 'HESTIA',
      url: 'https://hestia.earth/cycle/x',
    });
    expect(sourceInText('median of seafood worldwide')).toEqual({
      label: 'median of seafood worldwide',
      url: null,
    });
  });
});
