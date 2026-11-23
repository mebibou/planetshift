import { GASES, type Climate, type Gas } from '../data/types';
import type { Baseline } from './api';
import { clamp, valueAt } from './util';

/** Share of the full shift reached in a year: 0 in the current year, 1 from rampEnd on. */
export const ramp = (year: number, currentYear: number, rampEnd: number): number =>
  rampEnd <= currentYear
    ? year >= rampEnd
      ? 1
      : 0
    : clamp((year - currentYear) / (rampEnd - currentYear), 0, 1);

/** Ratio of the baseline in a year to the base year, per gas. */
export type Scale = (gas: Gas, year: number) => number;

/** Population: today's diet × population. ssp2: SSP2-4.5's agricultural emissions path. */
export const baselineScale = (
  baseline: Baseline,
  climate: Climate,
  worldPopulation: Readonly<Record<number, number>>,
  baseYear: number,
): Scale => {
  if (baseline === 'population') {
    const base = worldPopulation[baseYear] ?? 0;
    const years = Object.keys(worldPopulation).map(Number);
    const values = years.map((y) => worldPopulation[y] ?? 0);
    return (_gas, year) => (base > 0 ? valueAt(years, values, year) / base : 1);
  }
  const ratios = Object.fromEntries(
    GASES.map((gas) => {
      const { years, values } = climate.agricultureEmissions.ssp245[gas];
      const base = valueAt(years, values, baseYear);
      return [gas, (year: number) => (base > 0 ? valueAt(years, values, year) / base : 1)];
    }),
  ) as Record<Gas, (year: number) => number>;
  return (gas, year) => ratios[gas](year);
};

/** The same scale, its values over `years` computed once (others as before). */
export const tabulate = (scale: Scale, years: readonly number[]): Scale => {
  const first = years[0] ?? 0;
  const table = Object.fromEntries(
    GASES.map((g) => [g, Float64Array.from(years, (y) => scale(g, y))]),
  ) as Record<Gas, Float64Array>;
  return (gas, year) => {
    const k = year - first;
    return k >= 0 && k < years.length && years[k] === year
      ? (table[gas][k] as number)
      : scale(gas, year);
  };
};
