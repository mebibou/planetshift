import type { Land } from '../../data/types';
import type { Band } from '../../model/climate';
import { bandValue } from '../../model/bands';
import { uptakePath } from '../../model/land';
import { memoPer } from '../../model/util';

const median = (xs: readonly number[]): number => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length === 0
    ? 0
    : sorted.length % 2
      ? (sorted[mid] as number)
      : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
};

const tableMedian = memoPer<Land, number>();

/** A country's rate, or the median of the table's countries for a country missing from it. */
export const countryRate = (land: Land, iso3: string, band: Band): number =>
  land.regrowth[iso3]
    ? bandValue(land.regrowth[iso3], band)
    : tableMedian(land, band, () =>
        median(Object.values(land.regrowth).map((r) => bandValue(r, band))),
      );

/**
 * kg of CO₂ a year taken up once the shift is complete, net: each country's freed farmland
 * takes up CO₂ at its rate, and farmland it newly uses forgoes the same (negative `ha`).
 */
export const fullUptake = (
  net: readonly { iso3: string; ha: number }[],
  land: Land,
  band: Band,
): number => net.reduce((acc, f) => acc + f.ha * countryRate(land, f.iso3, band) * 1000, 0);

/** Net uptake by band, or zeros when regrowth is off. */
export const regrowthPaths = (
  natural: boolean,
  net: readonly { iso3: string; ha: number }[],
  land: Land,
  years: readonly number[],
  freedShare: (year: number) => number,
): Record<Band, number[]> => {
  const path = (band: Band) =>
    natural
      ? uptakePath(fullUptake(net, land, band), years, freedShare, land.regrowthYears)
      : years.map(() => 0);
  return { median: path('median'), p05: path('p05'), p95: path('p95') };
};
