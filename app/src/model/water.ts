import type { Water } from '../data/types';
import type { CountryResult } from './api';
import { oilcakeChange, type CakeDemand } from './land';
import type { Prepared, PreparedCountry } from './prepare';
import { dot, memoPer, sparseDot, type ItemVector } from './util';

export type WaterFields = Pick<
  CountryResult,
  'water' | 'waterChange' | 'waterScarcity' | 'waterScarcityChange'
>;

/** A country without water data. */
export const NO_WATER: WaterFields = {
  water: 0,
  waterChange: 0,
  waterScarcity: 0,
  waterScarcityChange: 0,
};

interface CountryWater {
  litres: ItemVector;
  scarcity: ItemVector;
  cake: Readonly<Record<string, number>>;
  /** Litres and L eq today, which no lever changes. */
  water?: number;
  waterScarcity?: number;
}

const waterCache = memoPer<PreparedCountry, CountryWater>();

const vectorOf = (prepared: Prepared, value: (code: string) => number): ItemVector =>
  Float64Array.from(prepared.items, (item) => value(String(item.code)));

/** A country's litres and L eq per tonne by item, and its oilcakes' litres a year. */
export const countryWater = (pc: PreparedCountry, water: Water, prepared: Prepared): CountryWater =>
  waterCache(pc, 'water', () => {
    const iso3 = pc.country.iso3;
    const own = water.byCountry[iso3] ?? {};
    const scarce = water.scarcity[iso3] ?? {};
    const cake = water.oilcake[iso3] ?? {};
    const litres = vectorOf(prepared, (code) => own[code]?.[0] ?? 0);
    const scarcity = vectorOf(prepared, (code) => scarce[code] ?? 0);
    return {
      litres,
      scarcity,
      cake,
      water: dot(litres, pc.emitting) + sumValues(cake),
      waterScarcity: dot(scarcity, pc.emitting),
    };
  });

const sumValues = (r: Readonly<Record<string, number>>): number =>
  Object.values(r).reduce((a, b) => a + b, 0);

/**
 * Litres withdrawn a year and L eq of scarcity-weighted use, today and their change: each item's
 * per tonne times its production and its change, and the oilcakes' litres following the animals
 * they feed. Water per tonne does not change with the levers.
 */
export const waterOf = (
  w: CountryWater,
  emitting: ItemVector,
  change: ItemVector,
  cake: CakeDemand,
): WaterFields => ({
  water: w.water ?? dot(w.litres, emitting) + sumValues(w.cake),
  waterChange: sparseDot(w.litres, change) + oilcakeChange(w.cake, cake.sharesOf, cake.relative),
  waterScarcity: w.waterScarcity ?? dot(w.scarcity, emitting),
  waterScarcityChange: sparseDot(w.scarcity, change),
});

/** A country's water and its change, none without `water.json`. */
export const countryWaterOf = (
  pc: PreparedCountry,
  change: ItemVector,
  prepared: Prepared,
  cake: CakeDemand,
): WaterFields & Pick<CountryResult, 'irrigatedHa'> => {
  const water = prepared.data.water;
  const irrigatedHa = water?.irrigatedHa[pc.country.iso3];
  return water
    ? {
        ...waterOf(countryWater(pc, water, prepared), pc.emitting, change, cake),
        ...(irrigatedHa ? { irrigatedHa } : {}),
      }
    : NO_WATER;
};
