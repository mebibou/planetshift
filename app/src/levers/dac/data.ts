import type { Range3 } from '../../data/types';

export const DAC_LEVER = 'directAirCapture';

/** The year whose net removal the summary shows. */
export const DAC_SUMMARY_YEAR = 2050;

/** What a plant draws for each tonne it captures: electricity, and heat from a heat pump. */
export interface PlantEnergy {
  electricityKwh: number;
  heatKwh: number;
  cop: number;
}

/**
 * dac.json: the stored part of the IEA's path for direct air capture. Its Net Zero scenario's
 * capture (Gt a year) times the share stored rather than made into fuel, then its Delayed
 * Action Case's storage in 2100; each plant's energy, with a range, and the CO₂ of building it
 * and of its sorbent as a share of what it captures.
 */
export interface Dac {
  netZero: { years: number[]; capturedGt: number[] };
  storedShare: number;
  delayedAction: { year: number; storedGt: number };
  energy: Record<keyof Range3, PlantEnergy>;
  embodiedShare: Range3;
  source: string;
}

declare module '../../model/api' {
  interface Summary {
    /** CO₂ the capture takes out of the air in 2050 net of its energy and plants, kg a year. */
    dacCo2: { median: number; p05: number; p95: number };
  }
}
