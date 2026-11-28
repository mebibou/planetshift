// The model's public interface: what the UI calls. Implementations live beside this
// file (diet.ts, emissions.ts, climate.ts, run.ts…) and in the lever modules (src/levers/),
// and are pure.

import type {
  AnimalGroup,
  CauseWarming,
  ClimateMethod,
  FeedMethod,
  FireCountry,
  Gas,
  GasVector,
  Group,
  CountedCause,
  GasLeverCause,
  Scope,
  Ssp,
  TemperatureSource,
  Tier,
} from '../data/types';
import type { Family } from '../levers/registry';
import { unpackFoods, type CountryFoods, type PackedFoods } from './foodEmissions';
import type { SeaLevel2100, SeaLevelPaths } from './seaLevel';

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

/**
 * The production of the crops pollination.json rates, in tonnes and kcal, the part from crops
 * that depend on pollinators at all, and the part pollination gives (each crop's ratio).
 */
export interface PollinationTotals {
  tonnes: number;
  dependentTonnes: number;
  attributableTonnes: number;
  kcal: number;
  dependentKcal: number;
  attributableKcal: number;
}

export interface CountryResult {
  iso3: string;
  /**
   * Tonnes per year in the base year, by group, less what is processed into another item and
   * counted on it (milk made into butter): the tonnes whose emissions are counted.
   */
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
  /** The country's land area, ha; 0 where the data has none. */
  landArea: number;
  /** Farmed mammals' live weight, tonnes, and its change at the full shift; 0 without the file. */
  mammals: number;
  mammalsChange: number;
  /** Species its farmland commits to extinction; the change leaves out regrowth on freed land. */
  species: number;
  speciesChange: number;
  /** Freshwater withdrawn, litres a year, and its change at the full shift; 0 without water.json. */
  water: number;
  waterChange: number;
  /** Scarcity-weighted water use of the crops HESTIA covers, L eq a year, never added to litres. */
  waterScarcity: number;
  waterScarcityChange: number;
  /** Land equipped for irrigation, ha, where FAOSTAT gives it. */
  irrigatedHa?: number;
  /** Crop production and its pollinator-dependent part, today and its change; none without pollination.json. */
  pollination?: PollinationTotals;
  pollinationChange?: PollinationTotals;
  /** Food's emissions after the farm, kg a year, and their change at the full shift; none without chain.json. */
  chain?: GasVector;
  chainChange?: GasVector;
  /** What the food eaten in the country emits per person, kg a year, and its change with the levers. */
  footprint?: GasVector;
  footprintChange?: GasVector;
  /** Emissions by food group, which come with the breakdown. */
  foods?: CountryFoods;
  /** The country's latest fire season (fires.json): set by the map, not the run, as no lever changes it. */
  fire?: FireCountry;
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
    /**
     * The same by gas. Air pollution and aviation's non-CO₂ forcing are no gas, so a cause's
     * gases can fall short of its `avoidedByCause`.
     */
    avoidedByGas: Record<Gas, Record<GasLeverCause, number[]>>;
    /**
     * The median warming avoided each year by each food of the families split by food, °C, all
     * causes together: the same split as `summary.byFood`, year by year, zero before now.
     */
    avoidedByFood: Record<Family, Record<string, number[]>>;
    /**
     * What a choice of people on Earth changes in the baseline's median warming, by cause and
     * each gas's by cause, °C on `years`; absent when the population follows the UN's.
     */
    baselineChange?: CauseWarming;
  };
  /** The sea-level rise each year to 2100 without and with the levers, m; absent without the data. */
  seaLevel?: SeaLevelPaths;
  /** The surface ocean's pH each year to 2100 without and with the levers; absent without the data. */
  ocean?: SeaLevelPaths;
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
  /** Sea-level rise avoided by 2100 and AR6's rise without the levers, m; absent without the data. */
  seaLevel2100?: SeaLevel2100;
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
  /**
   * The share of each family split by food (`FoodSplit` in run.ts), by family, food and cause.
   * A family's foods add up to its causes in `byFamilyCause`.
   */
  byFood: {
    avoidedCo2e: ByFood<number>;
    avoidedWarming2050: ByFood<number>;
    avoidedWarming2100: ByFood<number>;
  };
}

/** A value for each food of each family split by food, by cause. */
export type ByFood<T> = Record<Family, Record<string, Record<CountedCause, T>>>;

type Temperature = ScenarioResult['temperature'];

/** What comes after the rest of a run: footprints, the by-family breakdown, the split by cause. */
export interface Breakdown {
  footprints: Record<string, Pick<CountryResult, 'footprint' | 'footprintChange'>>;
  foods: PackedFoods;
  summary: Pick<Summary, 'byFamily' | 'byFamilyCause' | 'byCause' | 'byFood'>;
  temperature: Pick<Temperature, 'avoidedByCause' | 'avoidedByGas' | 'avoidedByFood'>;
}

/** A run's result before its breakdown: what the sliders wait for. */
export type FirstResult = Omit<ScenarioResult, 'summary' | 'temperature'> & {
  summary: Omit<Summary, keyof Breakdown['summary']> & Partial<Breakdown['summary']>;
  temperature: Omit<Temperature, keyof Breakdown['temperature']> &
    Partial<Breakdown['temperature']>;
};

/** A result with its breakdown, its fields where a whole run puts them. */
export const withBreakdown = (result: FirstResult, breakdown: Breakdown): ScenarioResult => ({
  ...result,
  countries: result.countries.map((c) => ({
    ...c,
    ...breakdown.footprints[c.iso3],
    foods: unpackFoods(breakdown.foods, c.iso3),
  })),
  summary: { ...result.summary, ...breakdown.summary },
  temperature: { ...result.temperature, ...breakdown.temperature },
});

/** GWP100 (AR6, non-fossil CH₄), used only to show a CO₂e figure. */
export const GWP100: GasVector = { co2: 1, ch4: 27.0, n2o: 273, hfc: 1530 };
