import type { Mammals } from '../data/types';
import type { CountryResult } from '../model/api';

/** The world's farmed mammals against its wild ones, tonnes of live weight. */
export interface MammalRatio {
  farmedBefore: number;
  farmedAfter: number;
  wild: number;
  /** Tonnes of farmed mammals per tonne of wild ones, today and with the levers. */
  before: number;
  after: number;
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/**
 * Farmed mammals summed over the countries, today and at the full shift, against the wild
 * mammals on land and at sea; null without farmed or wild mammals in the data.
 */
export const mammalRatio = (
  countries: readonly Pick<CountryResult, 'mammals' | 'mammalsChange'>[],
  wild: Mammals['wild'] | undefined,
): MammalRatio | null => {
  const farmedBefore = sum(countries.map((c) => c.mammals));
  const farmedAfter = farmedBefore + sum(countries.map((c) => c.mammalsChange));
  const total = wild ? wild.land + wild.marine : 0;
  return farmedBefore > 0 && total > 0
    ? {
        farmedBefore,
        farmedAfter,
        wild: total,
        before: farmedBefore / total,
        after: farmedAfter / total,
      }
    : null;
};
