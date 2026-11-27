import { ANIMAL_GROUPS, type AnimalGroup } from '../data/types';

/** An oilseed's feed shares in all, and weighted by each group's relative change. */
export interface CakeWeights {
  total: number;
  change: number;
}

export const cakeWeights = (
  shares: Partial<Record<AnimalGroup, number>> | undefined,
  relative: Partial<Record<AnimalGroup, number>>,
): CakeWeights => {
  let total = 0;
  let change = 0;
  for (const g of ANIMAL_GROUPS) {
    const share = shares?.[g] ?? 0;
    total += share;
    change += share * (relative[g] ?? 0);
  }
  return { total, change };
};

/**
 * Change in an amount an oilseed's cake carries (its land, or its emissions): it changes with the
 * production of the animal groups the cake feeds, weighted by its feed shares, and never falls
 * below zero.
 */
export const cakeAmountChange = (amount: number, { total, change }: CakeWeights): number =>
  total > 0 ? Math.max(-amount, (amount * change) / total) : 0;

/** How the cake's land follows the animals: each group's relative change, the feed shares. */
export interface CakeDemand {
  relative: Partial<Record<AnimalGroup, number>>;
  sharesOf: (code: string) => Partial<Record<AnimalGroup, number>> | undefined;
}
