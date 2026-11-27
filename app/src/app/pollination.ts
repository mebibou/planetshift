import type { CountryResult, PollinationTotals } from '../model/api';
import { POLLINATION_KEYS } from '../model/pollination';
import { recordFrom } from '../model/util';

/** Crop production's shares from pollinator-dependent crops and given by pollination. */
export interface PollinationShares {
  dependentTonnes: number;
  attributableTonnes: number;
  dependentKcal: number;
  attributableKcal: number;
}

type Rated = Pick<CountryResult, 'pollination' | 'pollinationChange'>;

const ratio = (part: number, whole: number): number => (whole > 0 ? part / whole : 0);

/** Each part as a share of crop production, by tonnes and by kcal. */
export const sharesOf = (t: PollinationTotals): PollinationShares => ({
  dependentTonnes: ratio(t.dependentTonnes, t.tonnes),
  attributableTonnes: ratio(t.attributableTonnes, t.tonnes),
  dependentKcal: ratio(t.dependentKcal, t.kcal),
  attributableKcal: ratio(t.attributableKcal, t.kcal),
});

const added = (a: PollinationTotals, b: PollinationTotals): PollinationTotals =>
  recordFrom(POLLINATION_KEYS, (k) => a[k] + b[k]);

const NONE: PollinationTotals = recordFrom(POLLINATION_KEYS, () => 0);

/** Whether a country produces any crop pollination.json rates. */
export const hasPollination = (c: Rated): boolean => (c.pollination?.tonnes ?? 0) > 0;

/** A country's totals today and with the levers in full. */
export const pollinationTotals = (
  c: Rated,
): { before: PollinationTotals; after: PollinationTotals } => {
  const before = c.pollination ?? NONE;
  return { before, after: added(before, c.pollinationChange ?? NONE) };
};

/** The shares today and with the levers, of one country or summed over several; null without data. */
export const pollinationShares = (
  countries: readonly Rated[],
): { before: PollinationShares; after: PollinationShares } | null => {
  const totals = countries.map(pollinationTotals);
  const before = totals.map((t) => t.before).reduce(added, NONE);
  const after = totals.map((t) => t.after).reduce(added, NONE);
  return before.tonnes > 0 ? { before: sharesOf(before), after: sharesOf(after) } : null;
};
