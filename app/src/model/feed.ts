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

const fedCache = memoPer<PreparedCountry, Uint32Array>();

/** The items a country feeds, the only ones whose feed use can change. */
const fedItems = (pc: PreparedCountry): Uint32Array =>
  fedCache(pc, 'fed', () =>
    Uint32Array.from(Array.from(pc.feed).flatMap((t, i) => (t > 0 ? [i] : []))),
  );

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
  for (const i of fedItems(pc)) {
    let a = 0;
    for (let g = 0; g < split.length; g++)
      a += ((split[g] as ItemVector)[i] as number) * (change[g] as number);
    out[i] = a;
  }
  return out;
};

/** How the world uses each animal item: see `animalUse`. */
export interface AnimalUse {
  scale: ItemVector;
  worldFoodBase: ItemVector;
}

const useCache = memoPer<Prepared, AnimalUse>();

/**
 * For each animal item (1 for a plant), `scale`: the world's production less processing per
 * tonne of its world supply for food and for the feed that follows the animals, as an animal
 * item's other uses (tallow, industrial milk) and the gap between the world's imports and
 * exports come from animals raised for food and go with them; `worldFoodBase`: the world's
 * production less processing that serves food, against which a change in food alone gives the
 * groups' change in full.
 */
export const animalUse = (prepared: Prepared, method: FeedMethod): AnimalUse =>
  useCache(prepared, method, () => {
    const n = prepared.items.length;
    const [food, fed] = prepared.countries.reduce(
      ([f, d], pc) => {
        const followed = feedByGroup(pc, prepared, method);
        const m = pc.multipliers;
        return [
          f.map((a, i) => a + (pc.food[i] as number) * (m[i] as number)),
          d.map(
            (a, i) => a + followed.reduce((t, v) => t + (v[i] as number), 0) * (m[i] as number),
          ),
        ];
      },
      [new Float64Array(n), new Float64Array(n)],
    );
    const used = food.map((f, i) => f + (fed[i] as number));
    const animal = (i: number) => prepared.items[i]?.animal === true && (used[i] as number) > 0;
    const world = prepared.worldEmitting;
    return {
      scale: used.map((u, i) => (animal(i) ? (world[i] as number) / u : 1)),
      worldFoodBase: used.map((u, i) =>
        animal(i) ? ((world[i] as number) * (food[i] as number)) / u : (world[i] as number),
      ),
    };
  });
