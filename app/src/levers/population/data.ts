import type { Series } from '../../data/types';

/**
 * population.json: world population, people, from 1850 to the last estimate (`history`: Our
 * World in Data's long-run series to 1949, UN WPP 2024's estimates from 1950), then WPP 2024's
 * medium, low and high variants to 2100; and each country's low and high variant over its
 * medium one in `ratioYears` (1 in `lastEstimate`, linear between), which the app applies to
 * the countries' own medium population (countries.json). A country left out takes the world's
 * ratio.
 */
export interface PopulationData {
  world: { history: Series; medium: Series; low: Series; high: Series };
  lastEstimate: number;
  ratioYears: number[];
  byCountry: Record<string, { low: number[]; high: number[] }>;
  source: string;
}

const NONE: Series = { years: [], values: [] };

export const EMPTY_POPULATION: PopulationData = {
  world: { history: NONE, medium: NONE, low: NONE, high: NONE },
  lastEstimate: 0,
  ratioYears: [],
  byCountry: {},
  source: '',
};

declare module '../../data/types' {
  interface ModelData {
    population: PopulationData;
  }
}

export const VARIANTS = ['medium', 'low', 'high'] as const;
export type PopulationVariant = (typeof VARIANTS)[number];
