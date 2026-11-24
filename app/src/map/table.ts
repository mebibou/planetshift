import type { Tier } from '../data/types';
import type { CountryResult } from '../model/api';
import { beforeAfter, measureOf, relativeChange, type LandUseCo2, type LayerSpec } from './layers';
import type { TierSource } from './sources';

/** One country of the table view and of the map's CSV: the layer's values before and after. */
export interface TableRow {
  iso3: string;
  name: string;
  /** Every name the search matches: both languages and the ISO code. */
  names: string[];
  before: number;
  after: number;
  /** Relative change, or null when there was nothing before. */
  change: number | null;
  /** The least precise source among the country's items, where the layer has one. */
  tier: Tier | null;
  source: string | null;
}

export const COLUMNS = ['name', 'before', 'after', 'change', 'tier'] as const;
export type Column = (typeof COLUMNS)[number];
export type Direction = 'ascending' | 'descending';
export interface Sort {
  column: Column;
  direction: Direction;
}

/** Production and emissions come from intensities with a tier; farmland and clearing do not. */
export const hasTier = (spec: LayerSpec): boolean =>
  spec.layer === 'quality' || ['production', 'emissions'].includes(measureOf(spec));

/** The columns a layer shows: data quality is only its tier and source, land-use CO₂ one value. */
export const columnsOf = (spec: LayerSpec): Column[] =>
  spec.layer === 'quality'
    ? ['name', 'tier']
    : spec.layer === 'landCo2'
      ? ['name', 'before', 'after']
      : hasTier(spec)
        ? [...COLUMNS]
        : ['name', 'before', 'after', 'change'];

/** The order the table opens in: the column the map colours by, largest first. */
export const defaultSort = (spec: LayerSpec): Sort => ({
  column: spec.layer === 'quality' ? 'tier' : spec.layer === 'change' ? 'change' : 'after',
  direction: 'descending',
});

/** The worst tier behind a country's figures and its source, from the scope's or the result's. */
const tierOf = (c: CountryResult, worst: TierSource | null) => ({
  tier: worst?.tier ?? c.worstTier,
  source: worst?.source ?? (c.worstSource || null),
});

export const tableRows = (
  countries: CountryResult[],
  spec: LayerSpec,
  namesOf: (iso3: string) => { name: string; names: string[] },
  worstOf: (c: CountryResult) => TierSource | null,
  landUse: LandUseCo2 = new Map(),
): TableRow[] =>
  countries
    .filter((c) => spec.layer !== 'landCo2' || landUse.has(c.iso3))
    .map((c) => {
      const ba = beforeAfter(c, spec, landUse);
      return {
        iso3: c.iso3,
        ...namesOf(c.iso3),
        before: ba.before,
        after: ba.after,
        change: relativeChange(ba),
        ...(hasTier(spec) ? tierOf(c, worstOf(c)) : { tier: null, source: null }),
      };
    });

/** Lower case without accents, so "cote" finds Côte d'Ivoire. */
export const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

export const filterRows = (rows: TableRow[], query: string): TableRow[] => {
  const q = fold(query);
  return q ? rows.filter((r) => r.names.some((n) => fold(n).includes(q))) : rows;
};

const valueOf = (row: TableRow, column: Column): number | string | null =>
  column === 'name' ? row.name : row[column];

/** Two present values in ascending order: text by the locale, numbers by size. */
const compareValues = (va: number | string, vb: number | string, locale: string): number =>
  typeof va === 'string' || typeof vb === 'string'
    ? String(va).localeCompare(String(vb), locale)
    : va - vb;

/** A missing value after a present one; 0 when both are missing. */
const missingLast = (va: unknown, vb: unknown): number => (va === vb ? 0 : va === null ? 1 : -1);

/** Sorted by one column; a country without a value comes last whichever the direction. */
export const sortRows = (rows: TableRow[], sort: Sort, locale: string): TableRow[] => {
  const sign = sort.direction === 'ascending' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const [va, vb] = [valueOf(a, sort.column), valueOf(b, sort.column)];
    const order =
      va === null || vb === null ? missingLast(va, vb) : sign * compareValues(va, vb, locale);
    return order === 0 ? a.name.localeCompare(b.name, locale) : order;
  });
};

/** Clicking a column sorts by it in its natural order; clicking it again reverses it. */
export const nextSort = (current: Sort, column: Column): Sort =>
  current.column === column
    ? {
        column,
        direction: current.direction === 'ascending' ? 'descending' : 'ascending',
      }
    : { column, direction: column === 'name' ? 'ascending' : 'descending' };

export interface Page<R> {
  rows: R[];
  /** 1-based, clamped to the pages there are. */
  page: number;
  pages: number;
  /** 1-based positions of the first and last row shown; 0 and 0 when there are none. */
  from: number;
  to: number;
  total: number;
}

export const pageOf = <R>(rows: R[], page: number, size: number): Page<R> => {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const start = (current - 1) * size;
  const shown = rows.slice(start, start + size);
  return {
    rows: shown,
    page: current,
    pages,
    from: shown.length ? start + 1 : 0,
    to: start + shown.length,
    total: rows.length,
  };
};

export const PAGE_SIZE = 20;
