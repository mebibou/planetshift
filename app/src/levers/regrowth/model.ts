import type { Land } from '../../data/types';
import type { Band } from '../../model/climate';
import { uptakePath } from '../../model/land';

/** A regrowth rate range read in the direction of each band: p05 the slower, p95 the faster. */
export const rateFor = (rate: Land['regrowth'][string] | undefined, band: Band): number =>
  !rate
    ? 0
    : band === 'median'
      ? rate.median
      : band === 'p05'
        ? Math.min(rate.low, rate.high)
        : Math.max(rate.low, rate.high);

/** kg of CO₂ a year that the freed land of every country takes up once the shift is complete. */
export const fullUptake = (
  freed: readonly { iso3: string; ha: number }[],
  land: Land,
  band: Band,
): number => freed.reduce((acc, f) => acc + f.ha * rateFor(land.regrowth[f.iso3], band) * 1000, 0);

/** Uptake by band, or zeros when regrowth is off. */
export const regrowthPaths = (
  natural: boolean,
  freed: readonly { iso3: string; ha: number }[],
  land: Land,
  years: readonly number[],
  freedShare: (year: number) => number,
): Record<Band, number[]> => {
  const path = (band: Band) =>
    natural
      ? uptakePath(fullUptake(freed, land, band), years, freedShare, land.regrowthYears)
      : years.map(() => 0);
  return { median: path('median'), p05: path('p05'), p95: path('p95') };
};
