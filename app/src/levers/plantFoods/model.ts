import type { Item } from '../../data/types';
import { basisVector } from '../../model/diet';
import type { Prepared, PreparedCountry } from '../../model/prepare';
import { mixOf } from '../../model/replacement';
import { addVectors, memoPer, type ItemVector } from '../../model/util';
import { PLANT_FOODS, PLANT_SWAPS, type PlantFood } from './data';

/** Each item's plant food as its index in PLANT_FOODS, or −1. */
const plantFoodCache = memoPer<readonly Item[], Int8Array>();
const plantFoodsOf = (prepared: Prepared): Int8Array =>
  plantFoodCache(prepared.items, 'plantFoods', () =>
    Int8Array.from(prepared.items, (item) =>
      PLANT_FOODS.findIndex((f) => PLANT_SWAPS[f].food(item)),
    ),
  );

const substituteCache = memoPer<PreparedCountry, ItemVector>();

/** The share of a plant food's calories each substitute takes: the country's mix, else the world's. */
export const substitutesOf = (
  food: PlantFood,
  pc: PreparedCountry,
  prepared: Prepared,
): ItemVector =>
  substituteCache(pc, food, () =>
    mixOf([{ weight: 1, accepts: PLANT_SWAPS[food].substitute }], pc.food, prepared, 'kcal'),
  );

/** Each plant food's items less their share of what is eaten, tonnes, and the kcal each food lost. */
const removedPlants = (
  eaten: ItemVector,
  foods: Int8Array,
  shares: readonly number[],
  kcal: ItemVector,
): { removed: ItemVector; lost: number[] } => {
  const removed = new Float64Array(eaten.length);
  const lost = shares.map(() => 0);
  for (let i = 0; i < eaten.length; i++) {
    const k = foods[i] as number;
    if (k >= 0) {
      const t = Math.max(0, eaten[i] as number) * (shares[k] as number);
      removed[i] = -t;
      lost[k] = (lost[k] as number) + t * (kcal[i] as number);
    }
  }
  return { removed, lost };
};

/** The removed tonnes with `lost` kcal added to the substitutes, by their shares. */
const withSubstitutes = (
  removed: ItemVector,
  mix: ItemVector,
  kcal: ItemVector,
  lost: number,
): ItemVector =>
  Float64Array.from(removed, (t, i) => {
    const share = mix[i] as number;
    return share > 0 ? t + (lost * share) / (kcal[i] as number) : t;
  });

/**
 * Change in food supply from replacing plant foods, tonnes per item: each food loses its share
 * (`shares`, in the order of PLANT_FOODS) of what is `eaten`, and its substitutes get the same
 * calories.
 */
export const plantSwapChange = (
  eaten: ItemVector,
  shares: readonly number[],
  pc: PreparedCountry,
  prepared: Prepared,
): ItemVector => {
  const kcal = basisVector(prepared, 'kcal');
  const { removed, lost } = removedPlants(eaten, plantFoodsOf(prepared), shares, kcal);
  return PLANT_FOODS.reduce<ItemVector>(
    (acc, f, k) =>
      (lost[k] as number) > 0
        ? withSubstitutes(acc, substitutesOf(f, pc, prepared), kcal, lost[k] as number)
        : acc,
    removed,
  );
};

/** The diet's change in use with the plant foods replaced in what is eaten once it has moved. */
export const swappedUse = (
  pc: PreparedCountry,
  dietFood: ItemVector,
  shares: readonly number[],
  prepared: Prepared,
): ItemVector =>
  addVectors(dietFood, plantSwapChange(addVectors(pc.food, dietFood), shares, pc, prepared));
