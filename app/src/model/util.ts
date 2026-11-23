import type { Gas, GasVector } from '../data/types';

/**
 * A quantity per item (tonnes, weights…), indexed like Prepared.items. Dense arrays keep a run
 * over ~180 countries × ~100 items fast; functions here and in the model never write to a
 * vector they are given, only to the one they create and return.
 */
export type ItemVector = Float64Array;

export const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** Integers from..to inclusive. */
export const range = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

export const gasVector = (f: (gas: Gas) => number): GasVector => ({
  co2: f('co2'),
  ch4: f('ch4'),
  n2o: f('n2o'),
});

/** A record of a value per key, built without the entry arrays of Object.fromEntries (hot paths). */
export const recordFrom = <K extends string, V>(
  keys: readonly K[],
  f: (key: K, index: number) => V,
): Record<K, V> => {
  const out = {} as Record<K, V>;
  keys.forEach((k, i) => (out[k] = f(k, i)));
  return out;
};

export const ZERO_GAS: GasVector = gasVector(() => 0);
export const addGas = (a: GasVector, b: GasVector): GasVector => gasVector((g) => a[g] + b[g]);

export const zeros = (n: number): ItemVector => new Float64Array(n);

export const mapVector = (v: ItemVector, f: (value: number, index: number) => number): ItemVector =>
  v.map(f);

/** The element-wise sum, added in argument order (loops: this runs for every country on each move). */
export const addVectors = (first: ItemVector, ...rest: readonly ItemVector[]): ItemVector => {
  const out = Float64Array.from(first);
  const n = out.length;
  for (const v of rest) for (let i = 0; i < n; i++) out[i] = (out[i] as number) + (v[i] as number);
  return out;
};

export const dot = (a: ItemVector, b: ItemVector): number => {
  let acc = 0;
  for (let i = 0; i < a.length; i++) acc += (a[i] as number) * (b[i] as number);
  return acc;
};

export const vectorTotal = (v: ItemVector): number => v.reduce((a, b) => a + b, 0);

/** Weights rescaled to sum to 1, negatives dropped; all zero when nothing is positive. */
export const normalise = (weights: ItemVector): ItemVector => {
  const total = weights.reduce((a, w) => (w > 0 ? a + w : a), 0);
  return total > 0 ? weights.map((w) => (w > 0 ? w / total : 0)) : zeros(weights.length);
};

export const isEmpty = (v: ItemVector): boolean => v.every((x) => x === 0);

/** A series' value in a year: linear between points, held flat beyond its ends, NaN when empty. */
export const valueAt = (
  years: readonly number[],
  values: readonly number[],
  year: number,
): number => {
  const first = years[0];
  const direct = first === undefined ? undefined : values[year - first];
  if (first !== undefined && years[year - first] === year && direct !== undefined) return direct;
  const n = Math.min(years.length, values.length);
  if (n === 0) return NaN;
  const upper = years.findIndex((y, i) => i < n && y >= year);
  if (upper === 0) return values[0] as number;
  if (upper === -1) return values[n - 1] as number;
  const [y0, y1] = [years[upper - 1] as number, years[upper] as number];
  const [v0, v1] = [values[upper - 1] as number, values[upper] as number];
  return y1 === y0 ? v1 : v0 + ((v1 - v0) * (year - y0)) / (y1 - y0);
};

/** A value computed once per owner object and key, for what does not depend on the scenario. */
export const memoPer = <O extends object, V>() => {
  const store = new WeakMap<O, Map<string, V>>();
  return (owner: O, key: string, compute: () => V): V => {
    const byKey = store.get(owner) ?? new Map<string, V>();
    if (!store.has(owner)) store.set(owner, byKey);
    const found = byKey.get(key);
    if (found !== undefined) return found;
    const value = compute();
    byKey.set(key, value);
    return value;
  };
};

/** First and last year the model runs over. */
export const FIRST_YEAR = 1850;
export const END_YEAR = 2100;

const tables = new WeakMap<readonly number[], Float64Array>();

/**
 * valueAt for a data series read every year of every run: its values from FIRST_YEAR to END_YEAR
 * tabulated once per values array, as it is never changed.
 */
export const dataValueAt = (
  years: readonly number[],
  values: readonly number[],
  year: number,
): number => {
  if (year < FIRST_YEAR || year > END_YEAR) return valueAt(years, values, year);
  const found = tables.get(values);
  const table =
    found ??
    Float64Array.from({ length: END_YEAR - FIRST_YEAR + 1 }, (_, i) =>
      valueAt(years, values, FIRST_YEAR + i),
    );
  if (!found) tables.set(values, table);
  return table[year - FIRST_YEAR] as number;
};

export const zerosOn = (years: readonly number[]): number[] => years.map(() => 0);

export const addSeries = (a: readonly number[], b: readonly number[]): number[] =>
  a.map((v, i) => v + (b[i] ?? 0));

export const subtractPaths = (a: readonly GasVector[], b: readonly GasVector[]): GasVector[] =>
  a.map((v, i) => gasVector((g) => v[g] - (b[i]?.[g] ?? 0)));

/**
 * A value kept per owner object for its latest key only: for what depends on one control, so
 * moving any other control reuses it without the cache growing as that control moves.
 */
export const memoLatest = <O extends object, V>() => {
  const store = new WeakMap<O, { key: string; value: V }>();
  return (owner: O, key: string, compute: () => V): V => {
    const found = store.get(owner);
    if (found && found.key === key) return found.value;
    const value = compute();
    store.set(owner, { key, value });
    return value;
  };
};
