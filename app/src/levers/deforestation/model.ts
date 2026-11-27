import type { Prepared, PreparedCountry } from '../../model/prepare';
import { cachedIn, clamp, memoPer, type ItemVector } from '../../model/util';

/** A country's clearing and drained soils by the item they are tied to: kg a year, area in ha. */
export interface CountryClearing {
  co2: ItemVector;
  area: ItemVector;
  drained: ItemVector;
  drainedN2o: ItemVector;
  rewettedCh4: ItemVector;
  /** The items any of them has. */
  items: Uint32Array;
}

const byItem = (
  prepared: Prepared,
  byCode: Readonly<Record<string, number>> | undefined,
  unit: number,
): ItemVector =>
  Float64Array.from(prepared.items, (item) => (byCode?.[String(item.code)] ?? 0) * unit);

const cache = memoPer<PreparedCountry, CountryClearing>();

/** A country's clearing and drained soils by item, once per country. */
export const countryClearing = (pc: PreparedCountry, prepared: Prepared): CountryClearing =>
  cache(pc, 'clearing', () => {
    const d = prepared.data.deforestation;
    const iso3 = pc.country.iso3;
    const vectors = {
      co2: byItem(prepared, d.byCountry[iso3], 1000),
      area: byItem(prepared, d.areaByCountry?.[iso3], 1),
      drained: byItem(prepared, d.drainedByCountry?.[iso3], 1000),
      drainedN2o: byItem(prepared, d.drainedN2oByCountry?.[iso3], 1000),
      rewettedCh4: byItem(prepared, d.rewettedCh4ByCountry?.[iso3], 1000),
    };
    const all = Object.values(vectors);
    return {
      ...vectors,
      items: Uint32Array.from(
        prepared.items.flatMap((_, i) => (all.some((v) => v[i] !== 0) ? [i] : [])),
      ),
    };
  });

/**
 * How far clearing tied to an item can move with its production: down to none, up to double.
 * The cap guards against a small producer whose output multiplies.
 */
export const MAX_RISE = 1;

const clearedCache = new WeakMap<ItemVector, Uint32Array>();

/** The items with clearing, once per clearing vector: most items have none. */
const clearedItems = (clearing: ItemVector): Uint32Array =>
  cachedIn(clearedCache, clearing, () =>
    Uint32Array.from(Array.from(clearing).flatMap((d, i) => (d !== 0 ? [i] : []))),
  );

/** An item's relative change, −1..MAX_RISE, 0 where the country has none. */
const relativeAt = (change: ItemVector, emitting: ItemVector, i: number): number => {
  const base = emitting[i] as number;
  return base > 0 ? clamp((change[i] as number) / base, -1, MAX_RISE) : 0;
};

/**
 * Each step's relative change of the `items`, step after step of the items' length; only the
 * items are filled, as clearing is tied to a few.
 */
export const relativeChanges = (
  steps: readonly ItemVector[],
  emitting: ItemVector,
  items: Uint32Array,
): Float64Array => {
  const n = emitting.length;
  const out = new Float64Array(steps.length * n);
  steps.forEach((change, k) => {
    for (let j = 0; j < items.length; j++) {
      const i = items[j] as number;
      out[k * n + i] = relativeAt(change, emitting, i);
    }
  });
  return out;
};

export interface Parts {
  before: number;
  steps: number[];
  lever: number;
  leverJoint: number;
}

const same = (rel: number): number => rel;

/** Adds one item's clearing change per step to `totals`; returns its last relative change. */
const addSteps = (
  totals: number[],
  relative: Float64Array,
  n: number,
  i: number,
  d: number,
  shape: ((rel: number) => number) | undefined,
): number => {
  let previous = 0;
  let last = 0;
  for (let k = 0; k < totals.length; k++) {
    last = relative[k * n + i] as number;
    const rel = shape ? shape(last) : last;
    totals[k] = (totals[k] as number) + d * (rel - previous);
    previous = rel;
  }
  return last;
};

/**
 * Deforestation CO₂ before, kg a year, and its change shared out: clearing tied to an item
 * moves with the item's production (`shape` of its relative change), step by step (the diet
 * shift, then less waste…); the lever then stops `adoption` of what is left, of the base year's
 * clearing (`lever`) and of the steps' change in it (`leverJoint`). The changes add up to the
 * total. Only the items with clearing are visited, as this runs for every country in every pass
 * of the breakdown.
 */
export const clearingParts = (
  clearing: ItemVector,
  steps: readonly ItemVector[],
  emitting: ItemVector,
  adoption: number,
  shape: (rel: number) => number = same,
  relative: Float64Array = relativeChanges(steps, emitting, clearedItems(clearing)),
): Parts => {
  const items = clearedItems(clearing);
  const n = emitting.length;
  const totals = steps.map(() => 0);
  const shaped = shape !== same;
  let before = 0;
  let lever = 0;
  let leverJoint = 0;
  for (let j = 0; j < items.length; j++) {
    const i = items[j] as number;
    const d = clearing[i] as number;
    before += d;
    const last = addSteps(totals, relative, n, i, d, shaped ? shape : undefined);
    if (adoption > 0) {
      lever -= adoption * d;
      leverJoint -= adoption * d * last;
    }
  }
  return { before, steps: totals, lever, leverJoint };
};

const fallOnly = (rel: number): number => Math.min(0, rel);

/**
 * The CH₄ of rewetted drained soils, kg a year (`ch4`, what each item's drained soils would emit
 * once rewetted): the land production frees is rewetted step by step, and the lever rewets
 * `adoption` of the land left drained. Nothing is rewetted before.
 */
export const rewettedParts = (
  ch4: ItemVector,
  steps: readonly ItemVector[],
  emitting: ItemVector,
  adoption: number,
  relative?: Float64Array,
): Parts => {
  const p = clearingParts(ch4, steps, emitting, adoption, fallOnly, relative);
  const neg = (v: number) => 0 - v;
  return { before: 0, steps: p.steps.map(neg), lever: neg(p.lever), leverJoint: neg(p.leverJoint) };
};
