import type { Prepared, PreparedCountry } from '../../model/prepare';
import { multiplierWith } from '../../model/supplyChain';
import { memoPer, type ItemVector } from '../../model/util';
import type { Waste } from './data';

/** Edible waste after shops is at most this share of a country's food supply (waste.md). */
export const MAX_WASTE_SHARE = 0.4;

/**
 * Share of a country's food supply wasted after shops: its waste per person (kg) over its food
 * supply per person (kg, every item kept in the model), capped; 0 without an estimate.
 */
export const wasteShare = (
  waste: Waste['byCountry'][string] | undefined,
  foodTonnes: ItemVector,
  population: number,
): number => {
  if (!waste || population <= 0) return 0;
  const supplyKg = (foodTonnes.reduce((a, t) => a + t, 0) * 1000) / population;
  const wastedKg = waste.retail + waste.foodService + waste.household;
  return supplyKg > 0 ? Math.min(MAX_WASTE_SHARE, Math.max(0, wastedKg / supplyKg)) : 0;
};

const shareCache = memoPer<PreparedCountry, number>();

/** A country's share of food wasted after shops, 0..0.4, computed once. */
export const wasteShareOf = (pc: PreparedCountry, prepared: Prepared): number =>
  shareCache(pc, 'waste', () =>
    wasteShare(prepared.data.waste.byCountry[pc.country.iso3], pc.food, pc.population),
  );

/**
 * Change in food supply once waste after shops is cut by `cut`, applied to the shifted diet:
 * new food = (food + dietChange) × (1 − cut × share), so the change is the diet's minus the cut.
 */
export const foodWithLessWaste = (
  food: ItemVector,
  dietChange: ItemVector,
  share: number,
  cut: number,
): ItemVector => {
  const k = cut * share;
  return k > 0 ? dietChange.map((d, i) => d - k * ((food[i] as number) + d)) : dietChange;
};

/** Each item's change in supply per tonne of change in use, with losses cut by `cut`. */
export const multipliersWith = (
  lossShares: ItemVector,
  seedShares: ItemVector,
  cut: number,
): ItemVector => lossShares.map((l, i) => multiplierWith(l, seedShares[i] as number, cut));

/**
 * Supply no longer needed, tonnes, once losses are cut by `cut`: the losses avoided and, as
 * losses and seed are shares of supply, the losses and seed that supply no longer carries.
 */
export const avoidedSupply = (
  losses: ItemVector,
  lossShares: ItemVector,
  seedShares: ItemVector,
  cut: number,
): ItemVector =>
  losses.map(
    (l, i) => cut * l * multiplierWith(lossShares[i] as number, seedShares[i] as number, cut),
  );
