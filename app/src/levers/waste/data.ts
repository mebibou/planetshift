export type LossGroup = 'cerealsPulses' | 'fruitVegetables' | 'rootsTubers' | 'animal' | 'all';

/**
 * waste.json: food wasted after it reaches shops, kg per person per year, by country
 * (retail, food service, household), and FAO's share of production lost from harvest up to
 * shops, by country and group of items.
 */
export interface Waste {
  byCountry: Record<string, { retail: number; foodService: number; household: number }>;
  lossShares?: Record<string, Record<LossGroup, number>>;
  source: string;
}

export const EMPTY_WASTE: Waste = { byCountry: {}, source: '' };

declare module '../../data/types' {
  interface ModelData {
    waste: Waste;
  }
}
