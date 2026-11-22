import type { Prepared, PreparedCountry } from '../../model/prepare';
import { clamp, memoPer, type ItemVector } from '../../model/util';

const cache = memoPer<PreparedCountry, ItemVector>();

/** A country's deforestation CO₂ by the item it serves, kg a year. */
export const deforestationOf = (pc: PreparedCountry, prepared: Prepared): ItemVector =>
  cache(pc, 'deforestation', () => {
    const byCode = prepared.data.deforestation.byCountry[pc.country.iso3] ?? {};
    return Float64Array.from(prepared.items, (item) => (byCode[String(item.code)] ?? 0) * 1000);
  });

/**
 * How far clearing tied to an item can move with its production: down to none, up to double.
 * The cap guards against a small producer whose output multiplies.
 */
export const MAX_RISE = 1;

/** Relative change of each item's production, −1..MAX_RISE, 0 where the country has none. */
export const relativeChange = (change: ItemVector, emitting: ItemVector): ItemVector => {
  const out = new Float64Array(change.length);
  for (let i = 0; i < out.length; i++) {
    const base = emitting[i] as number;
    out[i] = base > 0 ? clamp((change[i] as number) / base, -1, MAX_RISE) : 0;
  }
  return out;
};

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

/**
 * Deforestation CO₂ before, kg a year, and its change shared out: clearing tied to an item
 * moves with the item's production, step by step (the diet shift, then less waste…); the lever
 * then stops `adoption` of what is left. The changes add up to the total. Only the items with
 * clearing are visited, as this runs for every country in every pass of the breakdown.
 */
export const clearingParts = (
  clearing: ItemVector,
  steps: readonly ItemVector[],
  emitting: ItemVector,
  adoption: number,
): { before: number; steps: number[]; lever: number } => {
  const items = clearedItems(clearing);
  const totals = steps.map(() => 0);
  let before = 0;
  let lever = 0;
  for (const i of items) {
    const d = clearing[i] as number;
    before += d;
    let previous = 0;
    for (let k = 0; k < steps.length; k++) {
      const rel = relativeAt(steps[k] as ItemVector, emitting, i);
      totals[k] = (totals[k] as number) + d * (rel - previous);
      previous = rel;
    }
    if (adoption > 0) lever -= adoption * d * (1 + previous);
  }
  return { before, steps: totals, lever };
};
