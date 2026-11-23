import type { Range3 } from '../../data/types';

/** Ways to store carbon in farmland. */
export const REMOVALS = ['coverCrops', 'agroforestry', 'biochar', 'enhancedWeathering'] as const;
export type RemovalId = (typeof REMOVALS)[number];

/**
 * removals.json: CO₂ taken up per hectare per year where a practice is adopted, by country
 * (or 'World'), on which land, on at most `maxShare` of it, for `years` years.
 */
export interface Removal {
  rate: Record<string, Range3>;
  appliesTo: 'cropland' | 'pasture' | 'farmland';
  maxShare: number;
  years: number;
  source: string;
}
export type Removals = Record<RemovalId, Removal>;

export const EMPTY_REMOVALS = {} as Removals;

declare module '../../data/types' {
  interface ModelData {
    removals: Removals;
  }
}

declare module '../../model/api' {
  interface Summary {
    /** CO₂ taken up by the carbon-in-farmland levers in the year the shift is complete, kg a year. */
    removalsCo2: { median: number; p05: number; p95: number };
  }
}
