import type { Land } from '../../data/types';
import { bandValue } from '../../model/bands';
import type { Band } from '../../model/climate';
import { uptakePath } from '../../model/land';

/** kg of CO₂ a year that the freed land of every country takes up once the shift is complete. */
export const fullUptake = (
  freed: readonly { iso3: string; ha: number }[],
  land: Land,
  band: Band,
): number =>
  freed.reduce((acc, f) => {
    const rate = land.regrowth[f.iso3];
    return rate ? acc + f.ha * bandValue(rate, band) * 1000 : acc;
  }, 0);

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
