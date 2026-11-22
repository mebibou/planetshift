import type { Range3 } from '../data/types';
import type { Band } from './climate';

/** A range read in the direction of each band: p05 the smaller, p95 the larger. */
export const bandValue = (r: Range3, band: Band): number =>
  band === 'median' ? r.median : band === 'p05' ? Math.min(r.low, r.high) : Math.max(r.low, r.high);

/**
 * A range's end in the direction of the band, where p95 is the band that avoids the most
 * warming: `more` says whether a larger value avoids more.
 */
export const towards = (r: Range3, band: Band, more: boolean): number =>
  band === 'median'
    ? r.median
    : (band === 'p95') === more
      ? Math.max(r.low, r.high)
      : Math.min(r.low, r.high);

export const bandRecord = <T>(f: (band: Band) => T): Record<Band, T> => ({
  median: f('median'),
  p05: f('p05'),
  p95: f('p95'),
});
