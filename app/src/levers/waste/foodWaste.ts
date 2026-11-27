import { countryCrops, cropChange, type Crops } from '../../model/crops';
import type { CakeDemand } from '../../model/land';
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

const sum = (v: ItemVector): number => {
  let t = 0;
  for (let i = 0; i < v.length; i++) {
    t += v[i] as number;
  }
  return t;
};

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

/** A country's crops, the change in its production and how the demand for oilcake follows it. */
export interface Production {
  crops: Crops;
  change: ItemVector;
  cake?: CakeDemand;
}

/** An item's production ratio, a crop's counting the items made from it (oil, sugar). */
const cropRatio = (p: Production, i: number): number =>
  productionRatio(
    p.crops.base[i] as number,
    cropChange(p.crops, i, p.change, p.crops.emitting, p.cake),
  );

/**
 * Tonnes lost before shops: each item's loss share of its supply, which follows the item's
 * production when `production` gives it today's and its change. A crop's follows the demand
 * for what is made from it too, so the fruit's losses follow its palm oil.
 */
export const lostTonnes = (
  shares: ItemVector,
  supply: ItemVector,
  production?: Production,
): number => {
  let t = 0;
  for (let i = 0; i < shares.length; i++) {
    const ratio = production ? cropRatio(production, i) : 1;
    t += (shares[i] as number) * (supply[i] as number) * ratio;
  }
  return t;
};

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
  /** The country's crops, the change in production with every lever and the oilcake's demand. */
  crops: Crops;
  change: ItemVector;
  cake?: CakeDemand;
  /** The Food wasted after shops and Losses before shops levers' adoption. */
  wasteCut: number;
  lossCut: number;
}

/**
 * Food lost and wasted today and its change with the levers, tonnes by stage. After shops, the
 * waste is its share of the food supply, the diet's change included, less the cut. Before shops,
 * the losses follow the country's production of each item, a crop's with the items made from it,
 * less the cut.
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
        crops: input.crops,
        change: input.change,
        cake: input.cake,
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
  context: Pick<FoodWasteInput, 'dietFood' | 'change' | 'cake' | 'wasteCut' | 'lossCut'>,
) =>
  foodWasteOf(
    {
      ...context,
      share: wasteShareOf(pc, prepared),
      food: pc.food,
      lossShares: lossSharesOf(pc, prepared),
      supply: pc.supply,
      crops: countryCrops(pc, prepared),
    },
    prepared.data.waste.byCountry[pc.country.iso3],
  );
