// The data contract between the pipeline (which writes app/public/data/*.json)
// and the app. docs/data-contract.md describes each file; change both together.

import type { Departures } from '../configSchema';

export const GASES = ['co2', 'ch4', 'n2o', 'hfc'] as const;
export type Gas = (typeof GASES)[number];
export type GasVector = Record<Gas, number>;

/**
 * The gases farming emits, which the files of intensities, emissions and attribution carry;
 * `hfc` (HFC-134a, the cold chain's refrigerants) comes only after the farm.
 */
export const FARM_GASES = ['co2', 'ch4', 'n2o'] as const;
export type FarmGas = (typeof FARM_GASES)[number];
export type FarmGasVector = Record<FarmGas, number>;

/** A farm gas vector's value of a gas, none of a gas farming does not emit. */
export const farmGasOf = (v: FarmGasVector, gas: Gas): number => (gas === 'hfc' ? 0 : v[gas]);

export const ANIMAL_GROUPS = [
  'ruminantMeat',
  'pigMeat',
  'poultryMeat',
  'dairy',
  'eggs',
  'seafood',
] as const;
export type AnimalGroup = (typeof ANIMAL_GROUPS)[number];

export const PLANT_GROUPS = [
  'cereals',
  'rice',
  'pulses',
  'oilCrops',
  'vegetables',
  'fruit',
  'rootsTubers',
  'sugarCrops',
  'nuts',
  'stimulants',
  'otherPlant',
] as const;
export type PlantGroup = (typeof PLANT_GROUPS)[number];
export type Group = AnimalGroup | PlantGroup;

export type Scope = 'farmGate' | 'cradleToFarmGate';
export type FeedMethod = 'species' | 'gleam';

/** meta.json */
export interface Meta {
  baseYear: number; // latest complete Food Balance Sheet year
  builtAt: string; // ISO date the pipeline ran
  /** The departures from FaIR in planetshift.config.json when the data was built. */
  departures?: Departures;
  sources: { id: string; name: string; version: string; url: string; licence: string }[];
}

/** countries.json */
export interface Country {
  iso3: string;
  fao: number; // FAOSTAT area code
  name: { en: string; fr: string };
  region: string; // FAOSTAT/M49 region name used for regional fallbacks
  highIncome: boolean; // World Bank high-income classification
  /** Population by year, baseYear..2100 inclusive, UN medium variant. */
  population: Record<string, number>;
}

/** items.json: one row per FAOSTAT Food Balance Sheet item kept in the model. */
export interface Item {
  code: number; // FBS item code
  name: { en: string; fr: string };
  group: Group;
  animal: boolean;
  kcalPerTonne: number; // food supply energy per tonne of food supply quantity
  proteinPerTonne: number; // tonnes of protein per tonne of food supply quantity
}

/**
 * supply.json: baseYear Food Balance Sheet, tonnes per year (primary equivalent).
 * byCountry[iso3][itemCode] = SupplyRow. Items absent from a country are omitted.
 */
export interface SupplyRow {
  production: number;
  imports: number;
  exports: number;
  food: number;
  feed: number;
  losses: number;
  processing: number;
  seed: number;
  other: number;
}
export interface Supply {
  baseYear: number;
  byCountry: Record<string, Record<string, SupplyRow>>;
}

/**
 * intensities.json: emissions per tonne of product, by gas, in kg of the gas.
 * byCountry[iso3][itemCode][scope] = Intensity.
 * tier: 1 HESTIA country, 2 HESTIA region or world, 3 FAOSTAT country, 4 published LCA
 * (Poore & Nemecek 2018 and similar, global), 5 proxy item (a similar item's best tier in the
 * same country), 6 group world median.
 */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6;

export interface Intensity {
  kgPerTonne: FarmGasVector;
  tier: Tier;
  source: string; // a URL (HESTIA node or FAOSTAT domain)
}
/** oilcake[iso3][oilseedCode][scope]: kg of each gas a year the crushed oilseed's cake carries. */
export type OilcakeEmissions = Record<
  string,
  Record<string, Partial<Record<Scope, FarmGasVector>>>
>;

/** nonFood[iso3]: kg of each gas a year from the animals raised but not farmed for food. */
export type NonFoodEmissions = Record<string, FarmGasVector>;

export interface Intensities {
  byCountry: Record<string, Record<string, Partial<Record<Scope, Intensity>>>>;
  oilcake?: OilcakeEmissions;
  nonFood?: NonFoodEmissions;
}
/**
 * intensities.json as written: each source once in `sources`, each cell's `source` its index
 * there. The loader turns it into `Intensities`.
 */
export interface IntensitiesFile {
  sources: string[];
  byCountry: Record<
    string,
    Record<string, Partial<Record<Scope, Omit<Intensity, 'source'> & { source: number }>>>
  >;
  oilcake?: OilcakeEmissions;
  nonFood?: NonFoodEmissions;
}

/**
 * feed.json: share of each feed item's feed use that goes to each animal group,
 * per method and region (region names as in Country.region, plus 'World').
 * shares[method][region][itemCode][group] sums to 1 over groups.
 */
export interface Feed {
  shares: Record<FeedMethod, Record<string, Record<string, Partial<Record<AnimalGroup, number>>>>>;
}

/**
 * land.json: land used by farming in the base year, and how fast freed land takes up carbon.
 * cropHaPerTonne[iso3][itemCode]: hectares harvested per tonne of the FBS item's production
 * (primary equivalent), for crops only; a crushed oilseed's oil carries its share of the crush's
 * value only.
 * oilcakeHa[iso3][oilseedCode]: the rest of the crushed oilseed's land, given to the cake fed
 * to animals.
 * fodderHa[iso3]: temporary meadows and pastures (grass sown on arable land), shared between the
 * ruminant groups as the country's pasture is.
 * pasture[iso3]: permanent meadows and pastures in hectares, and the share grazed by each
 * ruminant group (sums to 1 where the country has ruminants).
 * regrowth[iso3]: CO₂ taken up by natural regrowth on freed farmland, tonnes of CO₂ per hectare
 * per year, median and range, for `regrowthYears` years after the land is freed.
 * landArea[iso3]: the country's land area in hectares (FAOSTAT), for the share of it farmed;
 * a build without it leaves the map's land use layer empty.
 * crush[oilseedCode]: the oil crushing it gives, and the oil's share of the crush's value.
 */
export interface Land {
  cropHaPerTonne: Record<string, Record<string, number>>;
  oilcakeHa?: Record<string, Record<string, number>>;
  crush?: Record<string, { oil: string; oilShare: number }>;
  fodderHa?: Record<string, number>;
  landArea?: Record<string, number>;
  pasture: Record<string, { ha: number; shares: Partial<Record<AnimalGroup, number>> }>;
  regrowth: Record<string, { median: number; low: number; high: number }>;
  regrowthYears: number;
}

/** A median with a likely range. */
export interface Range3 {
  median: number;
  low: number;
  high: number;
}

/** A yearly series: years[i] ↔ values[i]. */
export interface Series {
  years: number[];
  values: number[];
}
export interface BandSeries {
  years: number[];
  median: number[];
  p05: number[];
  p95: number[];
}

export type Ssp = 'ssp126' | 'ssp245' | 'ssp370';
export type TemperatureSource = 'hadcrut5' | 'berkeley';
export type ClimateMethod = 'fair' | 'ar6';
/**
 * A cause of warming in `climate.attribution`: fossil fuels and industry, farming, land use, air
 * pollution (aerosols and their precursors, which cool), the natural factors (sun and volcanoes)
 * and the other human emissions with what the causes do not add up to. A build made before air
 * pollution and the natural factors were split has neither, and `other` holds them.
 */
/** The causes some lever acts on. */
export type LeverCause = 'fossilIndustry' | 'agriculture' | 'landUse';
/** The causes the levers' avoided warming is split by gas in: their own and other human emissions. */
export type GasLeverCause = LeverCause | 'other';

/**
 * The causes the levers' effects are counted in: those a lever acts on, and air pollution, which
 * the energy levers change with the fossil fuel they cut.
 */
export type CountedCause = LeverCause | 'airPollution' | 'other';

export type Cause =
  | 'fossilIndustry'
  | 'agriculture'
  | 'landUse'
  | 'airPollution'
  | 'natural'
  | 'permafrost'
  | 'other';

/** A part of one gas's warming: a greenhouse cause that emits it, or its other sources. */
export type GasCause = LeverCause | 'permafrost' | 'other';

/** Warming by cause of warming, and each gas's by the causes that emit it, °C by year. */
export interface CauseWarming {
  byCause: Partial<Record<Cause, number[]>>;
  byGas: Partial<Record<Gas, Partial<Record<GasCause, number[]>>>>;
}

/**
 * Permafrost carbon released as the world warms (AR6): kg of carbon per °C of warming above
 * 1850–1900, released over the century, with a range; the share released as CH₄, and the
 * years over which a degree's release is spread.
 */
export interface Permafrost {
  kgCPerDegree: Range3;
  ch4Share: number;
  releaseYears: number;
  source: string;
}

/** climate.json */
export interface Climate {
  /** Observed global mean surface temperature anomaly vs 1850–1900, °C. */
  observed: Record<TemperatureSource, Series>;
  /**
   * Absolute global temperature change potential: °C per kg of the gas emitted
   * in year 0, at horizon h = index (0..H years). fair has a 5–95% band, ar6 a median only.
   */
  agtp: Record<ClimateMethod, Record<Gas, { median: number[]; p05: number[]; p95: number[] }>>;
  /** Scenario temperature vs 1850–1900, from FaIR, historical then scenario, 1850–2100. */
  scenarioTemperature: Record<Ssp, BandSeries>;
  /** World agricultural emissions, kg per year by gas, PRIMAP-hist then scenario, 1850–2100. */
  agricultureEmissions: Record<Ssp, Record<FarmGas, Series>>;
  /** Warming attributed to each cause, °C vs 1850–1900, 1850–2100 under each SSP. */
  attribution: Record<
    Ssp,
    Partial<Record<Cause, BandSeries>> & Record<LeverCause | 'other', BandSeries>
  >;
  /**
   * Each greenhouse gas's warming by the causes that emit it, like `attribution`; `other` is the
   * gas's other sources and the causes' interactions. A build without it hides the gas switch.
   */
  attributionByGas?: Record<Ssp, Record<Gas, Partial<Record<GasCause, BandSeries>>>>;
  /**
   * Temperature vs 1850–1900 with natural forcing only (solar and volcanic, every human
   * emission held at its 1750 level), from FaIR, 1850–2100. Optional until the pipeline builds it.
   */
  naturalOnly?: BandSeries;
  permafrost: Permafrost;
}

export type EnsoPhase = 'elNino' | 'laNina' | 'neutral';

/**
 * enso.json: NOAA's Oceanic Niño Index as one value a year, the mean of the seasons centred from
 * the previous October to September, and the year's phase at ±`threshold` °C.
 */
export interface Enso {
  years: number[];
  oni: number[];
  phase: EnsoPhase[];
  threshold: number;
  source: string;
}

/** landuse.json: net CO₂ from land-use change, t a year, negative for a net sink. */
export interface LandUse {
  byCountry: Record<string, number>;
  world: number;
  years: [number, number];
  source: string;
}

/** How an impact is counted: times as often, a percentage, summers in a century, Mt a year. */
export type ImpactUnit = 'times' | 'percent' | 'perCentury' | 'megatonnes';

/**
 * One impact at each of its group's levels: a central value (`mid`), a range (`low`, `high`), or
 * both. A row has at least one of them.
 */
export interface ImpactRow {
  id: string;
  unit: ImpactUnit;
  /** Where the values are published: figure, panel, paragraph or page. */
  ref: string;
  mid?: number[];
  low?: number[];
  high?: number[];
}

export type ImpactGroupId = 'wgi' | 'wgii' | 'sr15' | 'heatwave';

/** The impacts one source assessed, at the same global warming levels, °C above 1850–1900. */
export interface ImpactGroup {
  id: ImpactGroupId;
  url: string;
  levels: number[];
  /** Read only when both futures lie within `levels`, as for the studies that stop at 2 °C. */
  jointly: boolean;
  rows: ImpactRow[];
}

/** impacts.json: what the IPCC and one study assessed at given levels of global warming. */
export interface Impacts {
  groups: ImpactGroup[];
}

/** `other`: the animals not raised for food, which follow no group. */
export type HerdGroup = AnimalGroup | 'other';

/** mammals.json: farmed mammals' live weight and the world's wild mammals, tonnes. */
export interface Mammals {
  year: number;
  byCountry: Record<string, Partial<Record<HerdGroup, number>>>;
  wild: { land: number; marine: number };
  source: string;
}

/** Species committed to extinction per hectare: [average, marginal]. */
export type SpeciesPerHa = [number, number];

/** species.json: species per hectare by country; the targeted fish with and without fishing, t. */
export interface Species {
  byCountry: Record<string, { cropland: SpeciesPerHa; pasture: SpeciesPerHa }>;
  described: number;
  fish: { unfished: number; fished: number };
  source: string;
}

/** A stage after the farm: shared between foods by Poore & Nemecek's weight, or by mass. */
export const CHAIN_STAGES = [
  'processing',
  'transport',
  'packaging',
  'retail',
  'household',
  'waste',
  'wastewater',
] as const;
export type ChainStage = (typeof CHAIN_STAGES)[number];

/**
 * chain.json: food's emissions after the farm. A food's kg of a gas per tonne at a stage is its
 * country's factor (the world's for a country without figures) times its weight at that stage,
 * 1 for the stages shared by mass.
 */
export interface Chain {
  year: number;
  weights: Record<string, Partial<Record<ChainStage, number>>>;
  byCountry: Record<string, Partial<Record<ChainStage, Partial<GasVector>>>>;
  world: Partial<Record<ChainStage, Partial<GasVector>>>;
}

/**
 * origins.json: where each country's imports of each food come from, as [origin iso3, share of
 * its imports] for the main origins; the shares left over come from the rest of the world.
 */
export interface Origins {
  years: [number, number];
  byCountry: Record<string, Record<string, [string, number][]>>;
}

/**
 * All files loaded together: the core's here, each lever module's added by its `data.ts`
 * (app/src/levers/<id>/data.ts), which also describes the file.
 */
export interface ModelData {
  meta: Meta;
  countries: Country[];
  items: Item[];
  supply: Supply;
  intensities: Intensities;
  feed: Feed;
  climate: Climate;
  land: Land;
  /** Optional: a build without it leaves the temperature chart without El Niño marks. */
  enso?: Enso;
  /** Optional: a build without it leaves the map's land-use CO₂ layer without data. */
  landuse?: LandUse;
  /** Optional: a build without it has no card on what the warming means. */
  impacts?: Impacts;
  /** Optional: a build without it has no farmed mammals figure or map layer. */
  mammals?: Mammals;
  /** Optional: a build without it has no species or fish figures and no species map layer. */
  species?: Species;
  /** Optional: a build without it counts nothing after the farm. */
  chain?: Chain;
  /** Optional: without it, every import takes the world's average intensity. */
  origins?: Origins;
  /** Not a file: the build's departures from FaIR stand for it when it is unset. */
  departures?: Departures;
}
