import type { SeaLevel } from '../data/types';

/** Sea-level rise, metres: the median and the ends of the likely range. */
export interface SeaLevelRange {
  median: number;
  low: number;
  high: number;
}

/** The sea-level figure: the rise without the levers by 2100, and what the levers avoid. */
export interface SeaLevel2100 {
  avoided: SeaLevelRange;
  baseline: SeaLevelRange;
}

/** A rise each year, metres above 1900 (or 1995–2014 without the observed record): median and likely range. */
export interface SeaLevelBand {
  median: number[];
  low: number[];
  high: number[];
}

/** The rise each year to 2100 without and with the levers. */
export interface SeaLevelPaths {
  years: number[];
  baseline: SeaLevelBand;
  scenario: SeaLevelBand;
}

const BASE = [1995, 2014] as const;
const END = 2100;
const ENDS = ['median', 'low', 'high'] as const;

const runningSum = (values: readonly number[]): number[] =>
  values.reduce<number[]>((sums, v, i) => {
    sums.push((sums[i - 1] ?? 0) + v);
    return sums;
  }, []);

/**
 * The rise each mid-year, metres relative to its 1995–2014 mean: dH/dt = rate·(T − balance),
 * summed over the years (`temperature`, °C each year from `years[0]`).
 */
export const rise = (
  years: readonly number[],
  temperature: readonly number[],
  mmPerYearPerDegree: number,
  balance: number,
): number[] => {
  const rate = mmPerYearPerDegree / 1000;
  const above = temperature.map((t) => rate * (t - balance));
  const level = runningSum(above).map((h, i) => h - (above[i] as number) / 2);
  const inBase = level.filter(
    (_, i) => (years[i] as number) >= BASE[0] && (years[i] as number) <= BASE[1],
  );
  const base = inBase.reduce((a, b) => a + b, 0) / Math.max(1, inBase.length);
  return level.map((h) => h - base);
};

const bandOf = (sea: SeaLevel, years: readonly number[], temperature: readonly number[]) =>
  Object.fromEntries(
    ENDS.map((e) => [
      e,
      rise(years, temperature, sea.mmPerYearPerDegree[e], sea.balanceTemperature[e]).map(
        (h) => h + (sea.baseAbove1900 ?? 0),
      ),
    ]),
  ) as unknown as SeaLevelBand;

/**
 * The rise without and with the levers each year to 2100, from the median temperature of each
 * (°C each year from `firstYear`). Each end of the likely range takes its own fit to Table 9.9.
 */
export const seaLevelPaths = (
  sea: SeaLevel,
  baseline: readonly number[],
  scenario: readonly number[],
  firstYear: number,
): SeaLevelPaths => {
  const n = END - firstYear + 1;
  const years = Array.from({ length: n }, (_, i) => firstYear + i);
  return {
    years,
    baseline: bandOf(sea, years, baseline.slice(0, n)),
    scenario: bandOf(sea, years, scenario.slice(0, n)),
  };
};

const lastOf = (values: readonly number[]) => values[values.length - 1] ?? 0;

/** The summary's figure: the rise without the levers by 2100, and how much less with them. */
export const seaLevel2100 = ({ baseline, scenario }: SeaLevelPaths): SeaLevel2100 => ({
  baseline: {
    median: lastOf(baseline.median),
    low: lastOf(baseline.low),
    high: lastOf(baseline.high),
  },
  avoided: {
    median: lastOf(baseline.median) - lastOf(scenario.median),
    low: lastOf(baseline.low) - lastOf(scenario.low),
    high: lastOf(baseline.high) - lastOf(scenario.high),
  },
});
