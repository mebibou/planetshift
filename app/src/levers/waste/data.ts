/**
 * waste.json: food wasted after it reaches shops, kg per person per year, by country
 * (retail, food service, household). Losses before shops are in supply.json.
 */
export interface Waste {
  byCountry: Record<string, { retail: number; foodService: number; household: number }>;
  source: string;
}

export const EMPTY_WASTE: Waste = { byCountry: {}, source: '' };

declare module '../../data/types' {
  interface ModelData {
    waste: Waste;
  }
}
