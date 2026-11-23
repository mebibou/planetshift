import type { Ssp } from '../../data/types';
import type { Band } from '../../model/climate';
import { range, valueAt } from '../../model/util';
import type { ShippingSulphur } from './data';

/** The forcing each year from the rule's first to `toYear`, W/m²: p05 the least, p95 the most. */
export const shippingForcing = (
  s: ShippingSulphur,
  ssp: Ssp,
  band: Band,
  toYear: number,
): number[] => {
  const erf = s.erf[ssp];
  const series = band === 'median' ? erf.median : band === 'p05' ? erf.low : erf.high;
  const first = s.years[0] ?? toYear + 1;
  return range(first, toYear).map((y) => valueAt(s.years, series, y));
};
