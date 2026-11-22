import {
  ANIMAL_GROUPS,
  type AnimalGroup,
  type Feed,
  type FeedMethod,
  type Group,
} from '../data/types';
import { groupTotals, type Prepared, type PreparedCountry } from './prepare';
import { memoPer, recordFrom, type ItemVector } from './util';

const totalsCache = new WeakMap<ItemVector, Record<Group, number>>();

/**
 * Group totals of a base vector, kept per vector: a base (a country's production, the world's)
 * is never written to once built, and is the same on every run.
 */
const baseTotals = (v: ItemVector, prepared: Prepared): Record<Group, number> => {
  const found = totalsCache.get(v);
  if (found) return found;
  const totals = groupTotals(v, prepared);
  totalsCache.set(v, totals);
  return totals;
};

/** Relative change of each animal group's production in a country (−1..), 0 where it has none. */
export const groupProductionChange = (
  production: ItemVector,
  change: ItemVector,
  prepared: Prepared,
): Record<AnimalGroup, number> => {
  const base = baseTotals(production, prepared);
  const changed = groupTotals(change, prepared);
  return recordFrom(ANIMAL_GROUPS, (g) => (base[g] > 0 ? changed[g] / base[g] : 0));
};

/** The feed item's split across animal groups: the region's, else the world's. */
export const feedSharesOf = (
  feed: Feed,
  method: FeedMethod,
  region: string,
  code: string,
): Partial<Record<AnimalGroup, number>> | undefined =>
  feed.shares[method]?.[region]?.[code] ?? feed.shares[method]?.['World']?.[code];

const splitCache = memoPer<PreparedCountry, readonly ItemVector[]>();

/** Tonnes of each item fed to each animal group (one vector per group, in ANIMAL_GROUPS order). */
export const feedByGroup = (
  pc: PreparedCountry,
  prepared: Prepared,
  method: FeedMethod,
): readonly ItemVector[] =>
  splitCache(pc, method, () => {
    const shares = prepared.items.map((item) =>
      feedSharesOf(prepared.data.feed, method, pc.country.region, String(item.code)),
    );
    return ANIMAL_GROUPS.map((g) => pc.feed.map((t, i) => (t > 0 ? t * (shares[i]?.[g] ?? 0) : 0)));
  });

/**
 * Change in feed use, tonnes per item: each feed item's use falls (or rises) with the
 * production of the groups it feeds, weighted by its feed shares. Items with no shares keep
 * their feed use.
 */
export const feedChange = (
  pc: PreparedCountry,
  groupChange: Record<AnimalGroup, number>,
  prepared: Prepared,
  method: FeedMethod,
): ItemVector => {
  const split = feedByGroup(pc, prepared, method);
  const change = ANIMAL_GROUPS.map((g) => groupChange[g]);
  const out = new Float64Array(pc.feed.length);
  for (let i = 0; i < out.length; i++) {
    let a = 0;
    for (let g = 0; g < split.length; g++)
      a += ((split[g] as ItemVector)[i] as number) * (change[g] as number);
    out[i] = a;
  }
  return out;
};
