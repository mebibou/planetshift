import { ANIMAL_GROUPS, GASES, PLANT_GROUPS, type GasVector, type Group } from '../data/types';
import { recordFrom } from './util';

/** kg a year; `parts` holds the modules' fields (clearing's CO₂) as [today, change]. */
export interface FoodEmissions {
  farm: GasVector;
  farmChange: GasVector;
  chain?: GasVector;
  chainChange?: GasVector;
  parts: Record<string, [number, number]>;
}

export type CountryFoods = Partial<Record<Group, FoodEmissions>>;

export const FOOD_GROUPS: readonly Group[] = [...ANIMAL_GROUPS, ...PLANT_GROUPS];

/**
 * One vector per country, as objects would make the worker's message ten times slower: for each
 * group of FOOD_GROUPS, farm, farmChange, chain and chainChange by gas, then each of `parts`.
 */
export interface PackedFoods {
  chain: boolean;
  parts: readonly string[];
  byCountry: Record<string, Float64Array>;
}

export const GAS_SLOTS = 4 * GASES.length;

export const foodWidth = (parts: number): number => GAS_SLOTS + 2 * parts;

const hasAny = (v: Float64Array, from: number, width: number): boolean =>
  v.subarray(from, from + width).some((x) => x !== 0);

export const unpackFoods = (packed: PackedFoods, iso3: string): CountryFoods | undefined => {
  const v = packed.byCountry[iso3];
  const width = foodWidth(packed.parts.length);
  const groupOf = (values: Float64Array, from: number): FoodEmissions => {
    const vector = (n: number) =>
      recordFrom(GASES, (_, j) => values[from + n * GASES.length + j] as number);
    return {
      farm: vector(0),
      farmChange: vector(1),
      ...(packed.chain ? { chain: vector(2), chainChange: vector(3) } : {}),
      parts: Object.fromEntries(
        packed.parts.map((key, p) => {
          const at = from + GAS_SLOTS + 2 * p;
          return [key, [values[at] as number, values[at + 1] as number]];
        }),
      ),
    };
  };
  return (
    v &&
    Object.fromEntries(
      FOOD_GROUPS.flatMap((group, k) =>
        hasAny(v, k * width, width) ? [[group, groupOf(v, k * width)]] : [],
      ),
    )
  );
};
