import type { Prepared, PreparedCountry } from '../../model/prepare';
import { multiplierWith } from '../../model/supplyChain';
import { memoLatest, memoPer, type ItemVector } from '../../model/util';
import type { Group } from '../../data/types';
import type { LossGroup, Waste } from './data';

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
  const supplyKg = (foodTonnes.reduce((a, t) => a + t, 0) * 1000) / population;
  return waste && population > 0 && supplyKg > 0
    ? Math.min(
        MAX_WASTE_SHARE,
        Math.max(0, (waste.retail + waste.foodService + waste.household) / supplyKg),
      )
    : 0;
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

/** FAO's group of each item group; the items outside its four groups take its all-products share. */
const LOSS_GROUPS: Partial<Record<Group, LossGroup>> = {
  cereals: 'cerealsPulses',
  rice: 'cerealsPulses',
  pulses: 'cerealsPulses',
  fruit: 'fruitVegetables',
  vegetables: 'fruitVegetables',
  rootsTubers: 'rootsTubers',
  ruminantMeat: 'animal',
  pigMeat: 'animal',
  poultryMeat: 'animal',
  dairy: 'animal',
  eggs: 'animal',
  seafood: 'animal',
};

export const lossGroupOf = (group: Group): LossGroup => LOSS_GROUPS[group] ?? 'all';

/**
 * Each item's share of supply lost before shops: FAO's for its group where higher than the food
 * balance's, which leaves out processing; the food balance's without FAO's.
 */
export const lossSharesWith = (
  balance: ItemVector,
  groups: readonly LossGroup[],
  fao: Record<LossGroup, number> | undefined,
): ItemVector =>
  fao ? balance.map((s, i) => Math.max(s, fao[groups[i] as LossGroup] ?? 0)) : balance;

/**
 * Each item's change in supply per tonne of change in use once losses are cut by `cut`: its
 * multiplier with no cut scaled by the cut's effect, so that a cut of 0 changes nothing.
 */
export const multipliersWith = (
  base: ItemVector,
  lossShares: ItemVector,
  seedShares: ItemVector,
  cut: number,
): ItemVector =>
  lossShares.map((l, i) => {
    const s = seedShares[i] as number;
    return ((base[i] as number) * multiplierWith(l, s, cut)) / multiplierWith(l, s, 0);
  });

/**
 * Supply no longer needed, tonnes, once losses are cut by `cut`: the losses avoided and, as
 * losses and seed are shares of supply, the losses and seed that supply no longer carries.
 */
export const avoidedSupply = (
  losses: ItemVector,
  multipliers: ItemVector,
  cut: number,
): ItemVector => losses.map((l, i) => cut * l * (multipliers[i] as number));

/** A country's multipliers and the supply it no longer needs once losses are cut by `cut`. */
export interface LossChain {
  multipliers: ItemVector;
  avoided: ItemVector;
}

const chainCache = memoLatest<PreparedCountry, LossChain>();
const groupCache = memoPer<Prepared, LossGroup[]>();

const groupsOf = (prepared: Prepared): LossGroup[] =>
  groupCache(prepared, 'lossGroups', () => prepared.items.map((item) => lossGroupOf(item.group)));

const lossShareCache = memoPer<PreparedCountry, ItemVector>();

/** Each item's share of a country's supply lost before shops, computed once. */
export const lossSharesOf = (pc: PreparedCountry, prepared: Prepared): ItemVector =>
  lossShareCache(pc, 'lossShares', () =>
    lossSharesWith(
      pc.lossShares,
      groupsOf(prepared),
      prepared.data.waste.lossShares?.[pc.country.iso3],
    ),
  );

/** A country's supply chain with its losses cut by `cut`, kept for its latest cut. */
export const lossChain = (pc: PreparedCountry, prepared: Prepared, cut: number): LossChain =>
  chainCache(pc, String(cut), () => {
    const shares = lossSharesOf(pc, prepared);
    const multipliers = multipliersWith(pc.multipliers, shares, pc.seedShares, cut);
    const losses = shares.map((l, i) => l * (pc.supply[i] as number));
    return { multipliers, avoided: avoidedSupply(losses, multipliers, cut) };
  });
