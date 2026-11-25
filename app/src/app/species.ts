import type { Species } from '../data/types';
import type { CountryResult } from '../model/api';
import { speciesAfter, type SpeciesFields } from '../model/species';

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/** The world's species committed to extinction by farmland, today and with the levers. */
export interface SpeciesTotal {
  before: number;
  after: number;
  /** The described species of the groups the factors cover. */
  described: number;
}

/** Summed over the countries; null without species factors in the data. */
export const speciesTotal = (
  countries: readonly SpeciesFields[],
  species: Pick<Species, 'described'> | undefined,
): SpeciesTotal | null => {
  const before = sum(countries.map((c) => c.species));
  return species && before > 0
    ? { before, after: sum(countries.map(speciesAfter)), described: species.described }
    : null;
};

/** The ocean's targeted fish, tonnes, today and with the levers, and without fishing. */
export interface FishTotal {
  unfished: number;
  before: number;
  after: number;
  /** The relative change in the catch. */
  catchChange: number;
}

/**
 * The fish the fisheries target, today and once the catch follows the world's production of
 * fish and seafood: the biomass lost to fishing scales with the catch, from none unfished to
 * Bianchi et al.'s at today's catch.
 */
export const fishTotal = (
  countries: readonly Pick<CountryResult, 'production' | 'productionChange'>[],
  fish: Species['fish'] | undefined,
): FishTotal | null => {
  const production = sum(countries.map((c) => c.production.seafood ?? 0));
  const catchChange =
    production > 0 ? sum(countries.map((c) => c.productionChange.seafood ?? 0)) / production : 0;
  const lost = fish ? fish.unfished - fish.fished : 0;
  return fish && production > 0
    ? {
        unfished: fish.unfished,
        before: fish.fished,
        after: fish.unfished - lost * Math.max(0, 1 + catchChange),
        catchChange,
      }
    : null;
};
