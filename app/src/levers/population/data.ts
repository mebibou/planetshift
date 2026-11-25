import type { Gas, Series, Ssp } from '../../data/types';

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

/** The species of people.json: greenhouse gases, then the air pollutants coemissions.json prices. */
export const PEOPLE_SPECIES = [
  'co2',
  'ch4',
  'n2o',
  'so2',
  'bc',
  'oc',
  'nh3',
  'nox',
  'co',
  'voc',
] as const;
export type PeopleSpecies = (typeof PEOPLE_SPECIES)[number];

/**
 * people.json: each SSP's human emissions above their pre-industrial (1750) level, kg a year on
 * `years`, every source (farming, land use and fossil fuels alike), halogenated gases left out;
 * and `erf`, the forcing of their air pollution, W/m² with FaIR's 5–95% range (its aerosol-cloud
 * part a logarithm of the emissions, so it is not their sum times a forcing per kg). The
 * people-on-Earth thought experiment scales them with the number of people.
 */
export interface PeopleData {
  years: number[];
  bySsp: Partial<
    Record<
      Ssp,
      Record<PeopleSpecies, number[]> & {
        erf: { median: number[]; low: number[]; high: number[] };
        /** The parts that are fossil fuels and industry, and land use, kg a year by gas. */
        byCause?: Partial<
          Record<'fossilIndustry' | 'landUse' | 'waste', Partial<Record<Gas, number[]>>>
        >;
      }
    >
  >;
  /** Each SSP's own population, people on `years` (its marker run). */
  population?: Partial<Record<Ssp, number[]>>;
  source: string;
}

export const EMPTY_PEOPLE: PeopleData = { years: [], bySsp: {}, source: '' };

declare module '../../data/types' {
  interface ModelData {
    population: PopulationData;
    people: PeopleData;
  }
}

export const VARIANTS = ['medium', 'low', 'high'] as const;
export type PopulationVariant = (typeof VARIANTS)[number];
