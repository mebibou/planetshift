import type { Ssp } from '../../data/types';

/**
 * The forcing the IMO's 2020 limit on ships' fuel sulphur adds outside FaIR's calibrated ensemble,
 * W/m², by SSP on `years` from 2020, following each scenario's shipping fuel (climate.md).
 */
export interface ShippingSulphur {
  years: number[];
  erf: Record<Ssp, { median: number[]; low: number[]; high: number[] }>;
  source: string;
}

declare module '../../data/types' {
  interface Climate {
    shippingSulphur2020?: ShippingSulphur;
  }
}
