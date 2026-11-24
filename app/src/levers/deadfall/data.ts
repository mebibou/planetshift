/**
 * deadfall.json: CO₂ that large pelagic fish left uncaught would sink to the deep ocean, kg per
 * tonne less of each seafood item a country produces, by country and item code; the share of the
 * catch taken over deep water it assumes, and the years the storage takes to build up.
 */
export interface Deadfall {
  kgCo2PerTonne: Record<string, Record<string, number>>;
  deepWaterShare: number;
  buildUpYears: number;
  source: string;
}

export const EMPTY_DEADFALL: Deadfall = {
  kgCo2PerTonne: {},
  deepWaterShare: 0,
  buildUpYears: 10,
  source: '',
};

declare module '../../data/types' {
  interface ModelData {
    deadfall: Deadfall;
  }
}

/** 'on': uncaught large fish sink their carbon to the deep ocean when they die. */
export type DeadfallOption = 'off' | 'on';

declare module '../../model/api' {
  interface Options {
    deadfall: DeadfallOption;
  }
  interface CountryResult {
    /** CO₂ kept in the deep ocean once the storage has built up, kg a year (negative); option on. */
    deadfallCo2?: number;
  }
}
