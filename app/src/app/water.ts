import type { CountryResult } from '../model/api';

/** The world's freshwater withdrawn for farming, litres a year, today and with the levers. */
export interface WaterTotal {
  before: number;
  after: number;
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/** Litres withdrawn summed over the countries; null without water in the data. */
export const waterTotal = (
  countries: readonly Pick<CountryResult, 'water' | 'waterChange'>[],
): WaterTotal | null => {
  const before = sum(countries.map((c) => c.water));
  return before > 0 ? { before, after: before + sum(countries.map((c) => c.waterChange)) } : null;
};
