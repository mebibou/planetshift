import type { Gas, Group, Range3, Scope } from '../../data/types';

/** Where on the farm an emission comes from, so a practice can act on it. */
export const EMISSION_SOURCES = [
  'enteric',
  'manure',
  'rice',
  'syntheticFertiliser',
  'organicFertiliser',
  'residues',
  'fuel',
  'electricity',
  'inputsManufacture',
  'other',
] as const;
export type EmissionSource = (typeof EMISSION_SOURCES)[number];

/**
 * breakdown.json: the share of each gas of an item's intensity by source, matching
 * intensities.json. byCountry[iso3][itemCode][scope][gas][source] sums to 1 over sources
 * where the gas is non-zero. Items or countries missing fall back to world[itemCode].
 */
export interface Breakdown {
  world: Record<
    string,
    Partial<Record<Scope, Partial<Record<Gas, Partial<Record<EmissionSource, number>>>>>>
  >;
  byCountry: Record<
    string,
    Record<
      string,
      Partial<Record<Scope, Partial<Record<Gas, Partial<Record<EmissionSource, number>>>>>>
    >
  >;
}

/** A cut beyond `efficiency` switches to the grid: kg CO₂ per kg of fuel CO₂ replaced. */
export interface Electrified {
  efficiency: number;
  co2PerFuelCo2: Record<string, number>;
}

/** Farming practices that cut emissions at the source. */
export const PRACTICES = [
  'feedAdditives',
  'breedingAndFeed',
  'manureManagement',
  'riceWater',
  'nitrogenEfficiency',
  'nitrificationInhibitors',
  'farmEnergy',
] as const;
export type PracticeId = (typeof PRACTICES)[number];

/**
 * practices.json: what each practice cuts and by how much where it is adopted.
 * reduction: the fraction of the targeted emissions removed on adopting farms.
 * applicable[iso3 | 'World']: the share of the targeted emissions that could adopt it
 * (e.g. feed additives reach housed or fed animals only).
 */
export interface Practice {
  sources: EmissionSource[];
  gases: Gas[];
  groups?: Group[];
  reduction: Range3;
  applicable: Record<string, number>;
  electrified?: Electrified;
  source: string;
}
export type Practices = Record<PracticeId, Practice>;

export const EMPTY_BREAKDOWN: Breakdown = { world: {}, byCountry: {} };
export const EMPTY_PRACTICES = {} as Practices;

declare module '../../data/types' {
  interface ModelData {
    breakdown: Breakdown;
    practices: Practices;
  }
}
