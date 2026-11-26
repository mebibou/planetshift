import type { Prepared, PreparedCountry } from '../../model/prepare';
import type { ItemVector } from '../../model/util';
import type { Waste } from './data';
import { lossSharesOf, wasteShareOf } from './model';

/** The stages food is lost or wasted at: before shops, then in shops, food service and homes. */
export const FOOD_STAGES = ['losses', 'retail', 'foodService', 'household'] as const;
export type FoodStage = (typeof FOOD_STAGES)[number];
/** Tonnes a year by stage. */
export type FoodWaste = Record<FoodStage, number>;

type AfterShops = Exclude<FoodStage, 'losses'>;

const sum = (v: ItemVector): number => v.reduce((a, b) => a + b, 0);

/** Tonnes wasted after shops shared out by each sector's part of the country's estimate. */
export const afterShops = (
  estimate: Waste['byCountry'][string] | undefined,
  tonnes: number,
): Omit<FoodWaste, 'losses'> => {
  const total = estimate ? estimate.retail + estimate.foodService + estimate.household : 0;
  const part = (s: AfterShops) => (estimate && total > 0 ? (tonnes * estimate[s]) / total : 0);
  return { retail: part('retail'), foodService: part('foodService'), household: part('household') };
};

/** An item's production with the levers over today's; 1 where the country produces none. */
export const productionRatio = (emitting: number, change: number): number =>
  emitting > 0 ? Math.max(0, emitting + change) / emitting : 1;

/**
 * Tonnes lost before shops: each item's loss share of its supply, which follows the item's
 * production when `production` gives it today's and its change.
 */
export const lostTonnes = (
  shares: ItemVector,
  supply: ItemVector,
  production?: { emitting: ItemVector; change: ItemVector },
): number =>
  shares.reduce(
    (a, l, i) =>
      a +
      l *
        (supply[i] as number) *
        (production
          ? productionRatio(production.emitting[i] as number, production.change[i] as number)
          : 1),
    0,
  );

/** What the levers act on: the waste share after shops, the cuts and the changes they meet. */
export interface FoodWasteInput {
  /** Share of food supply wasted after shops. */
  share: number;
  /** Food supply, tonnes by item, and the diet's change in it (null: none). */
  food: ItemVector;
  dietFood: ItemVector | null;
  /** Each item's loss share of its supply, and its supply. */
  lossShares: ItemVector;
  supply: ItemVector;
  /** Production today and its change with every lever. */
  emitting: ItemVector;
  change: ItemVector;
  /** The Food wasted after shops and Losses before shops levers' adoption. */
  wasteCut: number;
  lossCut: number;
}

/**
 * Food lost and wasted today and its change with the levers, tonnes by stage. After shops, the
 * waste is its share of the food supply, the diet's change included, less the cut. Before shops,
 * the losses follow the country's production of each item, less the cut.
 */
export const foodWasteOf = (
  input: FoodWasteInput,
  estimate: Waste['byCountry'][string] | undefined,
): { before: FoodWaste; change: FoodWaste } => {
  const { share, food, dietFood, wasteCut, lossCut } = input;
  const eaten = sum(food);
  const wastedAfter = share * (1 - wasteCut) * (eaten + (dietFood ? sum(dietFood) : 0));
  const before = {
    losses: lostTonnes(input.lossShares, input.supply),
    ...afterShops(estimate, share * eaten),
  };
  const after = {
    losses:
      (1 - lossCut) *
      lostTonnes(input.lossShares, input.supply, {
        emitting: input.emitting,
        change: input.change,
      }),
    ...afterShops(estimate, wastedAfter),
  };
  return {
    before,
    change: {
      losses: after.losses - before.losses,
      retail: after.retail - before.retail,
      foodService: after.foodService - before.foodService,
      household: after.household - before.household,
    },
  };
};

/** A country's food lost and wasted, today and with the levers, from the run's context. */
export const countryFoodWaste = (
  pc: PreparedCountry,
  prepared: Prepared,
  context: Pick<FoodWasteInput, 'dietFood' | 'change' | 'wasteCut' | 'lossCut'>,
) =>
  foodWasteOf(
    {
      ...context,
      share: wasteShareOf(pc, prepared),
      food: pc.food,
      lossShares: lossSharesOf(pc, prepared),
      supply: pc.supply,
      emitting: pc.emitting,
    },
    prepared.data.waste.byCountry[pc.country.iso3],
  );
