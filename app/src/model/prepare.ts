import {
  ANIMAL_GROUPS,
  PLANT_GROUPS,
  type Country,
  type Group,
  type Item,
  type ModelData,
  type SupplyRow,
} from '../data/types';
import { domesticSupply, supplyMultiplier } from './supplyChain';
import {
  END_YEAR,
  addVectors,
  cachedIn,
  range,
  recordFrom,
  sum,
  valueAt,
  zeros,
  type ItemVector,
} from './util';

export interface PreparedCountry {
  country: Country;
  /** Supply rows of the items the model knows, by item code. */
  rows: ReadonlyMap<string, SupplyRow>;
  production: ItemVector;
  food: ItemVector;
  feed: ItemVector;
  /**
   * Production that emits here: production − processing, at least 0. The processed share is
   * counted on the derived items (oil, sugar, butter…), which have their own intensity.
   */
  emitting: ItemVector;
  /** Population in the base year. */
  population: number;
  /**
   * Change in domestic supply per tonne of change in end use (losses, processing and seed
   * scale with supply); the world's for an item the country has no row for.
   */
  multipliers: ItemVector;
  /** Losses and seed as shares of domestic supply (the world's for an item without a row). */
  lossShares: ItemVector;
  seedShares: ItemVector;
  losses: ItemVector;
  /** Domestic supply, tonnes: what every use adds up to. */
  supply: ItemVector;
}

/** Everything that does not depend on the scenario or the options, computed once per dataset. */
export interface Prepared {
  data: ModelData;
  baseYear: number;
  /** The items, in the order of every ItemVector. */
  items: readonly Item[];
  indexOf: ReadonlyMap<string, number>;
  itemByCode: ReadonlyMap<string, Item>;
  countries: readonly PreparedCountry[];
  worldProduction: ItemVector;
  worldEmitting: ItemVector;
  worldFood: ItemVector;
  /** World population by year, baseYear..END_YEAR. */
  worldPopulation: Readonly<Record<number, number>>;
}

const populationSeries = new WeakMap<Country, { years: number[]; values: number[] }>();

/** A country's population in a year, interpolated, held flat beyond its series. */
export const populationIn = (country: Country, year: number): number => {
  const cached = populationSeries.get(country);
  const series =
    cached ??
    (() => {
      const entries = Object.entries(country.population)
        .map(([y, p]) => [Number(y), p] as const)
        .sort((x, y) => x[0] - y[0]);
      const built = { years: entries.map(([y]) => y), values: entries.map(([, p]) => p) };
      populationSeries.set(country, built);
      return built;
    })();
  return valueAt(series.years, series.values, year);
};

const ZERO_ROW: SupplyRow = {
  production: 0,
  imports: 0,
  exports: 0,
  food: 0,
  feed: 0,
  losses: 0,
  processing: 0,
  seed: 0,
  other: 0,
};

const sumRows = (rows: readonly SupplyRow[]): SupplyRow =>
  rows.reduce(
    (a, r) => ({
      production: a.production + r.production,
      imports: a.imports + r.imports,
      exports: a.exports + r.exports,
      food: a.food + r.food,
      feed: a.feed + r.feed,
      losses: a.losses + r.losses,
      processing: a.processing + r.processing,
      seed: a.seed + r.seed,
      other: a.other + r.other,
    }),
    ZERO_ROW,
  );

/** A dense vector of one field of a country's supply rows. */
export const fieldOf = (
  items: readonly Item[],
  rows: ReadonlyMap<string, SupplyRow>,
  f: (row: SupplyRow) => number,
): ItemVector => Float64Array.from(items, (item) => f(rows.get(String(item.code)) ?? ZERO_ROW));

const buildPrepared = (data: ModelData): Prepared => {
  const { items } = data;
  const itemByCode = new Map(items.map((item) => [String(item.code), item]));
  const rowsOf = (iso3: string) =>
    new Map(
      Object.entries(data.supply.byCountry[iso3] ?? {}).filter(([code]) => itemByCode.has(code)),
    );
  const allRows = data.countries.map((c) => rowsOf(c.iso3));
  const worldRows = items.map((item) =>
    sumRows(allRows.flatMap((rows) => rows.get(String(item.code)) ?? [])),
  );
  const worldMultipliers = Float64Array.from(worldRows, supplyMultiplier);
  const shareOf = (row: SupplyRow, f: (r: SupplyRow) => number) => {
    const supply = domesticSupply(row);
    return supply > 0 ? f(row) / supply : 0;
  };
  const sharesOf = (rows: ReadonlyMap<string, SupplyRow>, f: (r: SupplyRow) => number) =>
    Float64Array.from(items, (item, k) =>
      shareOf(rows.get(String(item.code)) ?? (worldRows[k] as SupplyRow), f),
    );
  const countries = data.countries.map((country, i): PreparedCountry => {
    const rows = allRows[i] as ReadonlyMap<string, SupplyRow>;
    const population = populationIn(country, data.supply.baseYear);
    const food = fieldOf(items, rows, (r) => r.food);
    const people = Number.isFinite(population) ? population : 0;
    return {
      country,
      rows,
      production: fieldOf(items, rows, (r) => r.production),
      food,
      feed: fieldOf(items, rows, (r) => r.feed),
      emitting: fieldOf(items, rows, (r) => Math.max(0, r.production - r.processing)),
      population: people,
      multipliers: Float64Array.from(items, (item, k) => {
        const row = rows.get(String(item.code));
        return row ? supplyMultiplier(row) : (worldMultipliers[k] as number);
      }),
      lossShares: sharesOf(rows, (r) => r.losses),
      seedShares: sharesOf(rows, (r) => r.seed),
      losses: fieldOf(items, rows, (r) => r.losses),
      supply: fieldOf(items, rows, domesticSupply),
    };
  });
  const baseYear = data.supply.baseYear;
  return {
    data,
    baseYear,
    items,
    indexOf: new Map(items.map((item, i) => [String(item.code), i])),
    itemByCode,
    countries,
    worldProduction: addVectors(zeros(items.length), ...countries.map((c) => c.production)),
    worldEmitting: addVectors(zeros(items.length), ...countries.map((c) => c.emitting)),
    worldFood: addVectors(zeros(items.length), ...countries.map((c) => c.food)),
    worldPopulation: Object.fromEntries(
      range(baseYear, END_YEAR).map((y) => [
        y,
        sum(data.countries.map((c) => populationIn(c, y)).filter(Number.isFinite)),
      ]),
    ),
  };
};

const cache = new WeakMap<ModelData, Prepared>();

/**
 * The scenario-independent part of the model, cached per dataset object: call it once after
 * loading (runScenario calls it too, so this only moves the cost to load time).
 */
export const prepare = (data: ModelData): Prepared =>
  cachedIn(cache, data, () => buildPrepared(data));

/** An item's value in a vector, by FBS item code (0 for an unknown code). */
export const valueOf = (prepared: Prepared, v: ItemVector, code: string | number): number => {
  const i = prepared.indexOf.get(String(code));
  return i === undefined ? 0 : (v[i] as number);
};

/** A vector from values by item code; unknown codes are ignored. */
export const vectorFrom = (
  prepared: Prepared,
  byCode: Readonly<Record<string, number>>,
): ItemVector => Float64Array.from(prepared.items, (item) => byCode[String(item.code)] ?? 0);

/** Every food group, animal then plant: the order of the per-group vectors. */
export const GROUPS: readonly Group[] = [...ANIMAL_GROUPS, ...PLANT_GROUPS];
const GROUP_INDEX = new Map(GROUPS.map((g, k) => [g, k]));
const groupIndexCache = new WeakMap<readonly Item[], Int32Array>();

/** Each item's index in GROUPS, computed once per item list. */
export const groupIndicesOf = (items: readonly Item[]): Int32Array =>
  cachedIn(groupIndexCache, items, () =>
    Int32Array.from(items, (item) => GROUP_INDEX.get(item.group) ?? 0),
  );

/** Sum of a vector by item group, each group's items added in item order. */
export const groupTotals = (v: ItemVector, prepared: Prepared): Record<Group, number> => {
  const index = groupIndicesOf(prepared.items);
  const sums = new Float64Array(GROUPS.length);
  for (let i = 0; i < index.length; i++) {
    const k = index[i] as number;
    sums[k] = (sums[k] as number) + (v[i] as number);
  }
  return recordFrom(GROUPS, (_, k) => sums[k] as number);
};
