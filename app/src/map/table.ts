import type { Tier } from '../data/types';
import type { CountryResult } from '../model/api';
import { hasPollination } from '../app/pollination';
import {
  beforeAfter,
  gasValue,
  hasFireData,
  hasWasteData,
  measureOf,
  relativeChange,
  UNCHANGED,
  type GasChoice,
  type Layer,
  type LandUseCo2,
  type LayerSpec,
} from './layers';
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
  /** The Emissions layer's food emissions after the farm and clearing CO₂, in its gas; else null. */
  beyond: BeyondFarm;
}

export interface BeyondFarm {
  chainBefore: number | null;
  chainAfter: number | null;
  clearingBefore: number | null;
  clearingAfter: number | null;
  drainedBefore: number | null;
  drainedAfter: number | null;
}

const NO_BEYOND: BeyondFarm = {
  chainBefore: null,
  chainAfter: null,
  clearingBefore: null,
  clearingAfter: null,
  drainedBefore: null,
  drainedAfter: null,
};

/** The chain after the farm in a gas, today and with the levers, or nulls without the file. */
const chainOf = (c: CountryResult, gas: GasChoice) =>
  c.chain && c.chainChange
    ? {
        chainBefore: gasValue(c.chain, gas),
        chainAfter: gasValue(c.chain, gas) + gasValue(c.chainChange, gas),
      }
    : { chainBefore: null, chainAfter: null };

/** A land CO₂ today and with the levers; nulls without it. */
const beforeAfterOf = (before: number | undefined, change: number | undefined) =>
  before === undefined ? [null, null] : [before, before + (change ?? 0)];

/** The clearing and drained soils' CO₂, today and with the levers, in a gas that has CO₂; else nulls. */
const clearingOf = (c: CountryResult, gas: GasChoice) => {
  const shown = c.deforestationCo2 !== undefined && (gas === 'co2' || gas === 'co2e');
  const [clearingBefore, clearingAfter] = shown
    ? beforeAfterOf(c.deforestationCo2, c.deforestationChange)
    : [null, null];
  const [drainedBefore, drainedAfter] = shown
    ? beforeAfterOf(c.drainedCo2, c.drainedChange)
    : [null, null];
  return { clearingBefore, clearingAfter, drainedBefore, drainedAfter } as Pick<
    BeyondFarm,
    'clearingBefore' | 'clearingAfter' | 'drainedBefore' | 'drainedAfter'
  >;
};

/** Food's emissions beyond the farm, on the Emissions layer only. */
export const beyondFarm = (c: CountryResult, spec: LayerSpec): BeyondFarm =>
  spec.layer === 'emissions' ? { ...chainOf(c, spec.gas), ...clearingOf(c, spec.gas) } : NO_BEYOND;

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

/** Whether no lever changes what the layer shows: it has today's value alone. */
const unchanged = (spec: LayerSpec): boolean => UNCHANGED.includes(measureOf(spec));

/** The layers with columns of their own: data quality its tier, land-use CO₂ no change. */
const OWN_COLUMNS: Partial<Record<Layer, (spec: LayerSpec) => Column[]>> = {
  quality: () => ['name', 'tier'],
  landCo2: () => ['name', 'before', 'after'],
  waste: (spec) => (unchanged(spec) ? ['name', 'before'] : ['name', 'before', 'after', 'change']),
  fires: () => ['name', 'before'],
};

/** The columns a layer shows: today, with the levers and the change, and the tier where it has one. */
export const columnsOf = (spec: LayerSpec): Column[] =>
  OWN_COLUMNS[spec.layer]?.(spec) ??
  (hasTier(spec) ? [...COLUMNS] : ['name', 'before', 'after', 'change']);

/** The column the map colours by: the tier, the change, or the value with the levers (today's). */
const sortColumn = (spec: LayerSpec): Column =>
  spec.layer === 'quality'
    ? 'tier'
    : spec.layer === 'change'
      ? 'change'
      : unchanged(spec)
        ? 'before'
        : 'after';

/** The order the table opens in: the column the map colours by, largest first. */
export const defaultSort = (spec: LayerSpec): Sort => ({
  column: sortColumn(spec),
  direction: 'descending',
});

/** The worst tier behind a country's figures and its source, from the scope's or the result's. */
const tierOf = (c: CountryResult, worst: TierSource | null) => ({
  tier: worst?.tier ?? c.worstTier,
  source: worst?.source ?? (c.worstSource || null),
});

/** The layers listing only some countries: those the files give data for. */
const LISTED: Partial<
  Record<Layer, (c: CountryResult, landUse: LandUseCo2, spec: LayerSpec) => boolean>
> = {
  landCo2: (c, landUse) => landUse.has(c.iso3),
  mammals: (c) => c.mammals > 0 && c.landArea > 0,
  species: (c) => c.species > 0,
  water: (c) => c.water > 0,
  waterScarcity: (c) => c.waterScarcity > 0,
  waste: (c, _, spec) => hasWasteData(c, measureOf(spec)),
  fossilMethane: (c) => c.fossilMethane !== undefined,
  fires: (c, _, spec) => hasFireData(c, measureOf(spec)),
  pollination: hasPollination,
};

/** Whether the layer has data for a country. */
const listed = (c: CountryResult, spec: LayerSpec, landUse: LandUseCo2): boolean =>
  LISTED[spec.layer]?.(c, landUse, spec) ?? true;

export const tableRows = (
  countries: CountryResult[],
  spec: LayerSpec,
  namesOf: (iso3: string) => { name: string; names: string[] },
  worstOf: (c: CountryResult) => TierSource | null,
  landUse: LandUseCo2 = new Map(),
): TableRow[] =>
  countries
    .filter((c) => listed(c, spec, landUse))
    .map((c) => {
      const ba = beforeAfter(c, spec, landUse);
      return {
        iso3: c.iso3,
        ...namesOf(c.iso3),
        before: ba.before,
        after: ba.after,
        change: relativeChange(ba),
        ...(hasTier(spec) ? tierOf(c, worstOf(c)) : { tier: null, source: null }),
        beyond: beyondFarm(c, spec),
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
