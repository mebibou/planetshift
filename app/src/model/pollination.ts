import type { Item, Pollination, PollinationRatio } from '../data/types';
import type { CountryResult, PollinationTotals } from './api';
import type { Prepared, PreparedCountry } from './prepare';
import { dot, memoPer, recordFrom, sparseDot, type ItemVector } from './util';

export const POLLINATION_KEYS = [
  'tonnes',
  'dependentTonnes',
  'attributableTonnes',
  'kcal',
  'dependentKcal',
  'attributableKcal',
] as const satisfies readonly (keyof PollinationTotals)[];

type Key = (typeof POLLINATION_KEYS)[number];

/** What a tonne of an item adds to each total; nothing for an item without a ratio. */
export const perTonne = (item: Item, pair: PollinationRatio | undefined): PollinationTotals => {
  const [ratio, dependent] = pair ?? [0, 0];
  const counted = pair ? 1 : 0;
  const kcal = counted * item.kcalPerTonne;
  return {
    tonnes: counted,
    dependentTonnes: counted * dependent,
    attributableTonnes: counted * ratio,
    kcal,
    dependentKcal: kcal * dependent,
    attributableKcal: kcal * ratio,
  };
};

interface CountryVectors {
  perTonne: Record<Key, ItemVector>;
  before: PollinationTotals;
}

const cache = memoPer<PreparedCountry, CountryVectors>();

/** A country's totals per tonne of each item, its own crops' ratios before the world's. */
export const countryVectors = (
  pc: PreparedCountry,
  file: Pollination,
  prepared: Prepared,
): CountryVectors =>
  cache(pc, 'pollination', () => {
    const own = file.byCountry[pc.country.iso3] ?? {};
    const rows = prepared.items.map((item) => {
      const code = String(item.code);
      return perTonne(item, item.animal ? undefined : (own[code] ?? file.world[code]));
    });
    const vectors = recordFrom(POLLINATION_KEYS, (k) => Float64Array.from(rows, (r) => r[k]));
    return {
      perTonne: vectors,
      before: recordFrom(POLLINATION_KEYS, (k) => dot(vectors[k], pc.emitting)),
    };
  });

/** The totals today and their change with a production change. */
export const pollinationOf = (
  v: CountryVectors,
  change: ItemVector,
): Required<Pick<CountryResult, 'pollination' | 'pollinationChange'>> => ({
  pollination: v.before,
  pollinationChange: recordFrom(POLLINATION_KEYS, (k) => sparseDot(v.perTonne[k], change)),
});

/** A country's pollinator dependence and its change, none without `pollination.json`. */
export const countryPollinationOf = (
  pc: PreparedCountry,
  change: ItemVector,
  prepared: Prepared,
): Pick<CountryResult, 'pollination' | 'pollinationChange'> => {
  const file = prepared.data.pollination;
  return file ? pollinationOf(countryVectors(pc, file, prepared), change) : {};
};
