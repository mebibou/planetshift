import type { Ssp } from '../../data/types';

/**
 * An HFC's gas cycle as FaIR steps it: the share of its burden left after a year, and the forcing
 * a kg emitted adds by the year's end over what a kg of the carrier (HFC-134a) adds.
 */
export interface GasCycle {
  decay: number;
  relative: number;
}

/**
 * hfc.json, on `years`: each SSP's emissions of every HFC FaIR runs, kg a year, as fair.json has
 * them; the gas cycle of each from FaIR's calibration and its GWP100 (AR6); and the share of each HFC's emissions the
 * lever cuts at 100%.
 */
export interface HfcData {
  years: number[];
  cut: number;
  carrier: string;
  species: string[];
  cycles: Record<string, GasCycle>;
  gwp100: Record<string, number>;
  emissions: Record<Ssp, Record<string, number[]>>;
  source: string;
}

export const EMPTY_HFC = {} as HfcData;

declare module '../../data/types' {
  interface ModelData {
    hfc: HfcData;
  }
}

export const HFC_LEVER = 'hfcPhaseDown';

/** Whether hfc.json was loaded with data for the lever to act on. */
export const hasHfc = (file: Partial<HfcData> | undefined): file is HfcData =>
  file?.emissions !== undefined && Object.keys(file.emissions).length > 0;
