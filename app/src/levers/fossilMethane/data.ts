import type { Ssp } from '../../data/types';
import type { CoSector } from '../energy/data';

/** The methane the levers cut: leaked by oil and gas, and by coal mines. */
export const LEAK_GROUPS = ['oilGas', 'coal'] as const;
export type LeakGroup = (typeof LEAK_GROUPS)[number];
export type ByLeak = Record<LeakGroup, number>;

/**
 * fossilmethane.json, on `years`: the methane leaked producing the fuels.
 * avoidable: the share of each group's methane the lever removes at 100%.
 * emissions[ssp]: the world's leaks under the SSP, kg a year (CEDS in `cedsYear`, moved as the
 * SSP's energy methane).
 * perKgCo2[ssp][sector]: the part of coemissions.json's methane per kg of the sector's CO₂ that
 * leaks producing its fuel, kg per kg.
 * byCountry[iso3]: each country's leaks in `cedsYear`, kg.
 */
export interface FossilMethane {
  years: number[];
  cedsYear: number;
  avoidable: ByLeak;
  emissions: Record<Ssp, Record<LeakGroup, number[]>>;
  perKgCo2: Record<Ssp, Partial<Record<CoSector, Record<LeakGroup, number[]>>>>;
  byCountry: Record<string, ByLeak>;
  source: string;
}

export const EMPTY_FOSSIL_METHANE = {} as FossilMethane;

declare module '../../data/types' {
  interface ModelData {
    fossilmethane: FossilMethane;
  }
}

declare module '../../model/api' {
  interface CountryResult {
    /** Methane leaked by the country's oil, gas and coal in CEDS's year, kg, and the change at full adoption. */
    fossilMethane?: ByLeak;
    fossilMethaneChange?: number;
  }
}

export const FOSSIL_METHANE_LEVERS = ['oilGasMethane', 'coalMineMethane'] as const;
export type FossilMethaneLever = (typeof FOSSIL_METHANE_LEVERS)[number];

/** The lever that cuts each group's methane. */
export const LEVER_OF: Record<LeakGroup, FossilMethaneLever> = {
  oilGas: 'oilGasMethane',
  coal: 'coalMineMethane',
};

/** Whether fossilmethane.json was loaded with data for the levers to act on. */
export const hasFossilMethane = (fm: Partial<FossilMethane> | undefined): fm is FossilMethane =>
  fm?.emissions !== undefined && Object.keys(fm.emissions).length > 0;
