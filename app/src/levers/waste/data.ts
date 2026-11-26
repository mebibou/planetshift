import type { SolidWasteCountry } from '../../data/types';
import type { FoodWaste } from './foodWaste';

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

declare module '../../model/api' {
  interface CountryResult {
    /** Food lost before shops and wasted after them, tonnes a year by stage, and the change. */
    foodWaste?: FoodWaste;
    foodWasteChange?: FoodWaste;
    /** The country's municipal solid waste (solidwaste.json); no lever changes it. */
    municipalWaste?: SolidWasteCountry;
    /** Plastic reaching the ocean through rivers, tonnes a year; no lever changes it. */
    oceanPlastic?: number;
  }
}
