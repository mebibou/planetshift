import type { Prepared, PreparedCountry } from '../../model/prepare';
import { clamp, memoPer, type ItemVector } from '../../model/util';

const cache = memoPer<PreparedCountry, ItemVector>();

/** A country's deforestation CO₂ by the item it serves, kg a year. */
export const deforestationOf = (pc: PreparedCountry, prepared: Prepared): ItemVector =>
  cache(pc, 'deforestation', () => {
    const byCode = prepared.data.deforestation.byCountry[pc.country.iso3] ?? {};
    return Float64Array.from(prepared.items, (item) => (byCode[String(item.code)] ?? 0) * 1000);
  });

/** A country's CO₂ from drained organic soils by the item it is shared to, kg a year. */
export const drainedOf = (pc: PreparedCountry, prepared: Prepared): ItemVector =>
  cache(pc, 'drained', () => {
    const byCode = prepared.data.deforestation.drainedByCountry?.[pc.country.iso3] ?? {};
    return Float64Array.from(prepared.items, (item) => (byCode[String(item.code)] ?? 0) * 1000);
  });

/** The CH₄ a country's drained soils would emit once rewetted, by the item they are shared to, kg a year. */
export const rewettedCh4Of = (pc: PreparedCountry, prepared: Prepared): ItemVector =>
  cache(pc, 'rewettedCh4', () => {
    const byCode = prepared.data.deforestation.rewettedCh4ByCountry?.[pc.country.iso3] ?? {};
    return Float64Array.from(prepared.items, (item) => (byCode[String(item.code)] ?? 0) * 1000);
  });

/** A country's forest area cleared by the item it serves, hectares a year. */
export const clearedAreaOf = (pc: PreparedCountry, prepared: Prepared): ItemVector =>
  cache(pc, 'clearedArea', () => {
    const byCode = prepared.data.deforestation.areaByCountry?.[pc.country.iso3] ?? {};
    return Float64Array.from(prepared.items, (item) => byCode[String(item.code)] ?? 0);
  });

/**
 * How far clearing tied to an item can move with its production: down to none, up to double.
 * The cap guards against a small producer whose output multiplies.
 */
export const MAX_RISE = 1;

const clearedCache = memoPer<ItemVector, Uint32Array>();

/** The items with clearing, once per clearing vector: most items have none. */
const clearedItems = (clearing: ItemVector): Uint32Array =>
  clearedCache(clearing, 'cleared', () =>
    Uint32Array.from(Array.from(clearing).flatMap((d, i) => (d !== 0 ? [i] : []))),
  );

/** An item's relative change, −1..MAX_RISE, 0 where the country has none. */
const relativeAt = (change: ItemVector, emitting: ItemVector, i: number): number => {
  const base = emitting[i] as number;
  return base > 0 ? clamp((change[i] as number) / base, -1, MAX_RISE) : 0;
};

export interface Parts {
  before: number;
  steps: number[];
  lever: number;
  leverJoint: number;
}

const same = (rel: number): number => rel;

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
): Parts => {
  const items = clearedItems(clearing);
  const totals = steps.map(() => 0);
  let before = 0;
  let lever = 0;
  let leverJoint = 0;
  for (const i of items) {
    const d = clearing[i] as number;
    before += d;
    let previous = 0;
    let last = 0;
    for (let k = 0; k < steps.length; k++) {
      last = relativeAt(steps[k] as ItemVector, emitting, i);
      const rel = shape(last);
      totals[k] = (totals[k] as number) + d * (rel - previous);
      previous = rel;
    }
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
): Parts => {
  const p = clearingParts(ch4, steps, emitting, adoption, fallOnly);
  const neg = (v: number) => 0 - v;
  return { before: 0, steps: p.steps.map(neg), lever: neg(p.lever), leverJoint: neg(p.leverJoint) };
};
