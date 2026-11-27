import { FARM_GASES, GASES, type Climate, type FarmGas, type Gas } from '../data/types';
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
): Scale =>
  baseline === 'population'
    ? populationScale(worldPopulation, baseYear)
    : sspScale(climate, baseYear);

/** Population: today's diet × population, the same ratio for every gas. */
const populationScale = (
  worldPopulation: Readonly<Record<number, number>>,
  baseYear: number,
): Scale => {
  const base = worldPopulation[baseYear] ?? 0;
  const years = Object.keys(worldPopulation).map(Number);
  const values = years.map((y) => worldPopulation[y] ?? 0);
  return (_gas, year) => (base > 0 ? valueAt(years, values, year) / base : 1);
};

/**
 * SSP2-4.5's agricultural emissions path, gas by gas; HFC-134a, which comes only after the farm,
 * follows CO₂'s, as the chain's other emissions do.
 */
const sspScale = (climate: Climate, baseYear: number): Scale => {
  const farm = Object.fromEntries(
    FARM_GASES.map((gas) => {
      const { years, values } = climate.agricultureEmissions.ssp245[gas];
      const base = valueAt(years, values, baseYear);
      return [gas, (year: number) => (base > 0 ? valueAt(years, values, year) / base : 1)];
    }),
  ) as Record<FarmGas, (year: number) => number>;
  return (gas, year) => farm[gas === 'hfc' ? 'co2' : gas](year);
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

/** The rises up to `i`, each times the lag of the years since: Σ rises[k] × lag[i − k]. */
const laggedSum = (rises: readonly number[], lag: readonly number[], i: number): number => {
  let acc = 0;
  for (let k = 0; k <= i; k++) {
    acc += (rises[k] as number) * (lag[i - k] as number);
  }
  return acc;
};

/**
 * A share that builds up behind `share` with a first-order lag of `timeConstant` years: each
 * year's rise in it counts only 1 − e^(−t / timeConstant) of itself t years on.
 */
export const builtUp = (
  share: (year: number) => number,
  years: readonly number[],
  timeConstant: number,
): ((year: number) => number) => {
  const rises = years.map((y) => share(y) - share(y - 1));
  const lag = years.map((_, t) => 1 - Math.exp(-t / timeConstant));
  const values = years.map((_, i) => laggedSum(rises, lag, i));
  const first = years[0] ?? 0;
  return (year) => values[year - first] ?? 0;
};
