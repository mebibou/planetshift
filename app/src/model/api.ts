// The model's public interface: what the UI calls. Implementations live beside this
// file (diet.ts, emissions.ts, climate.ts, run.ts…) and in the lever modules (src/levers/),
// and are pure.

import type {
  AnimalGroup,
  ClimateMethod,
  FeedMethod,
  GasVector,
  Group,
  CountedCause,
  Scope,
  Ssp,
  TemperatureSource,
  Tier,
} from '../data/types';
import type { Family } from '../levers/registry';

export type { Family, LeverId } from '../levers/registry';
export { DEFAULT_OPTIONS } from './options';

/** Adoption of each lever by id, 0..1; a lever left out is not adopted. */
export type Levers = Partial<Record<string, number>>;

export type Basis = 'protein' | 'kcal';
/** 'plantMilk' is soy and oats, for replacing dairy with plant drinks. */
export type Replacement = 'current' | 'legumes' | 'plantMilk';
export type Baseline = 'population' | 'ssp2';
export type Location = 'fixedTrade' | 'domestic';
export type Where = 'world' | 'highIncome';

/** What the reader chooses with the controls. */
export interface Scenario {
  /** Share of animal food supply moved to plant food, 0..1, for every animal group. */
  shift: number;
  /** Per-group shares that override `shift`, 0..1. */
  groupShifts: Partial<Record<AnimalGroup, number>>;
  basis: Basis;
  replacement: Replacement;
  /** Year the full shift is reached; it ramps linearly from the current year. */
  rampEnd: number;
  where: Where;
  /** Adoption of each mitigation lever, 0..1, ramping in like the shift; empty is none. */
  levers: Levers;
}

/**
 * Method options, each with a default and one alternative or more. Lever modules add their own
 * (regrowth, data centres, permafrost) to this interface.
 */
export interface Options {
  scope: Scope;
  feed: FeedMethod;
  baseline: Baseline;
  location: Location;
  temperature: TemperatureSource;
  climate: ClimateMethod;
  ssp: Ssp;
}

export interface CountryResult {
  iso3: string;
  /** Tonnes of primary product per year in the base year, by group. */
  production: Record<Group, number>;
  /** Change in tonnes at the full shift, by group. */
  productionChange: Record<Group, number>;
  /** kg of each gas per year in the base year, and its change at the full shift. */
  emissions: GasVector;
  emissionsChange: GasVector;
  /** Lowest tier of intensity used for this country (see Intensity.tier). */
  worstTier: Tier;
  /** The `source` of the intensity that set `worstTier` (selected scope); '' when no item has one. */
  worstSource: string;
  /** Per-capita protein (g/day) and kcal (/day) before and after: equal on the kept basis. */
  proteinBefore: number;
  proteinAfter: number;
  kcalBefore: number;
  kcalAfter: number;
  /** Farmland in the base year, ha: cropland harvested and permanent pasture. */
  land: { cropland: number; pasture: number };
  /** Change in hectares at the full shift (negative when land is freed). */
  landChange: { cropland: number; pasture: number };
}

export type Band3 = { median: number; p05: number; p95: number };

export interface ScenarioResult {
  countries: CountryResult[];
  /**
   * World agricultural emissions per year by gas, kg, current year..2100, without and with the
   * diet shift and the farming levers (the energy levers are not farm emissions).
   */
  years: number[];
  baselineEmissions: GasVector[];
  scenarioEmissions: GasVector[];
  /**
   * Temperature, °C vs 1850–1900, 1850..2100. The baseline is the SSP's, with the population
   * baseline's farm emissions, the data centres beyond the SSP (option 'iea') and the permafrost
   * release (option 'on'); the scenario adds the levers' change and, with permafrost on, the
   * change in its release.
   */
  temperature: {
    years: number[];
    observed: (number | null)[];
    baseline: { median: number[]; p05: number[]; p95: number[] };
    scenario: { median: number[]; p05: number[]; p95: number[] };
    /** Warming avoided by the scenario, °C, each year (baseline − scenario), median and 5–95%. */
    avoided: { median: number[]; p05: number[]; p95: number[] };
    /**
     * The median warming avoided each year by cause, °C: the change in each cause's emissions
     * (and forcing) the levers make, with the permafrost change shared out by the size of each. Air
     * pollution's is negative where the energy levers' cleaner air unmasks warming. The causes
     * add up to `avoided.median`.
     */
    avoidedByCause: Record<CountedCause, number[]>;
  };
  summary: Summary;
}

/** The summary of a run; lever modules add their own figures to it. */
export interface Summary {
  /**
   * Avoided emissions in the year the shift is complete, kg by gas, and as CO₂e (GWP100,
   * display only): farm emissions, forest clearing, uptake and the energy levers' fossil CO₂.
   */
  avoided: GasVector;
  avoidedCo2e: number;
  /** Avoided warming in 2050 and 2100, °C, median and range. */
  avoidedWarming2050: { median: number; p05: number; p95: number };
  avoidedWarming2100: { median: number; p05: number; p95: number };
  /** Countries where an item would have gone below zero and was clipped. */
  clipped: string[];
  /** World farmland in the base year, ha, and the land the full shift frees (positive = freed). */
  landBefore: { cropland: number; pasture: number };
  landFreed: { cropland: number; pasture: number };
  /**
   * The avoided emissions (CO₂e, in the year the shift is complete) and the avoided warming
   * (°C, median) shared out by family: each family's Shapley value, the mean of what it adds
   * over every order the acting families can be counted in, so no family is counted first. The
   * shares add up to the totals. With permafrost on, the change in its release is shared out in
   * proportion to each family's avoided warming. The CO₂e shares leave out aviation's non-CO₂
   * forcing and permafrost, which are not in `avoided`.
   */
  byFamily: {
    avoidedCo2e: Record<Family, number>;
    avoidedWarming2050: Record<Family, number>;
    avoidedWarming2100: Record<Family, number>;
  };
  /**
   * Each family's share split by the cause it acts on: farm emissions count in farming,
   * clearing, regrowth and carbon stored in land use, fossil CO₂ and aviation's forcing in
   * fossil fuels and industry. A family's causes add up to its share in `byFamily`.
   */
  byFamilyCause: {
    avoidedCo2e: Record<Family, Record<CountedCause, number>>;
    avoidedWarming2050: Record<Family, Record<CountedCause, number>>;
    avoidedWarming2100: Record<Family, Record<CountedCause, number>>;
  };
  /** The same totals by cause, which add up to the totals. */
  byCause: {
    avoidedCo2e: Record<CountedCause, number>;
    avoidedWarming2050: Record<CountedCause, number>;
    avoidedWarming2100: Record<CountedCause, number>;
  };
}

/** GWP100 (AR6, non-fossil CH₄), used only to show a CO₂e figure. */
export const GWP100: GasVector = { co2: 1, ch4: 27.0, n2o: 273 };
