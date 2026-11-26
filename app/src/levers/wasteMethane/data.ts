import type { Range3, Series, Ssp } from '../../data/types';

/** The waste sectors the levers act on: CEDS's solid waste disposal and wastewater handling. */
export const WASTE_SECTORS = ['landfill', 'wastewater'] as const;
export type WasteSector = (typeof WASTE_SECTORS)[number];
export type BySector = Record<WasteSector, number>;

/** A country's methane of each sector, kg a year, and the share of its buried waste in landfills. */
export interface WasteMethaneCountry extends BySector {
  managed: number;
}

/**
 * wastemethane.json: CEDS's landfill and wastewater methane by country in `year`, kg, and every
 * waste sector's for the world (`total`); the waste cause's methane under each SSP, kg a year;
 * the share of a managed landfill's methane captured, of degradable waste diverted and of
 * wastewater's methane cut at full adoption, and the time constant of buried waste's decay.
 */
export interface WasteMethane {
  year: number;
  total: number;
  byCountry: Record<string, WasteMethaneCountry>;
  ch4: Record<Ssp, Series>;
  capture: Range3;
  diversion: Range3;
  wastewaterCut: Range3;
  decayYears: Range3;
  source: string;
}

export const EMPTY_WASTE_METHANE = {} as WasteMethane;

declare module '../../data/types' {
  interface ModelData {
    wastemethane: WasteMethane;
  }
}

/**
 * A country's waste methane, kg a year in CEDS's year by sector: today's, the food levers'
 * change in it, and the change with every lever once in full.
 */
export interface CountryWasteMethane {
  before: BySector;
  food: BySector;
  change: BySector;
}

declare module '../../model/api' {
  interface CountryResult {
    wasteMethane?: CountryWasteMethane;
  }
}

export const WASTE_METHANE_LEVERS = ['landfills', 'wastewater'] as const;
export type WasteMethaneLever = (typeof WASTE_METHANE_LEVERS)[number];

/** Whether wastemethane.json was loaded with data for the levers to act on. */
export const hasWasteMethane = (d: Partial<WasteMethane> | undefined): d is WasteMethane =>
  d?.ch4 !== undefined && Object.keys(d.byCountry ?? {}).length > 0;

const total = (v: BySector | undefined): number => (v ? v.landfill + v.wastewater : 0);

/** A country's landfill and wastewater methane, kg a year, and its change with the levers. */
export const wasteMethaneTotal = (c: { wasteMethane?: CountryWasteMethane }): [number, number] => [
  total(c.wasteMethane?.before),
  total(c.wasteMethane?.change),
];
