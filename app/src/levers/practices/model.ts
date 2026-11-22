import {
  ANIMAL_GROUPS,
  GASES,
  PLANT_GROUPS,
  type Gas,
  type Group,
  type Scope,
} from '../../data/types';
import { bandRecord, bandValue } from '../../model/bands';
import type { Band } from '../../model/climate';
import type { Prepared, PreparedCountry } from '../../model/prepare';
import { memoLatest, memoPer, range, zeros, type ItemVector } from '../../model/util';
import {
  EMISSION_SOURCES,
  PRACTICES,
  type Breakdown,
  type EmissionSource,
  type Practice,
  type Practices,
} from './data';

type GasSplit = Partial<Record<Gas, Partial<Record<EmissionSource, number>>>>;

const OTHER_SCOPE: Record<Scope, Scope> = {
  farmGate: 'cradleToFarmGate',
  cradleToFarmGate: 'farmGate',
};

/**
 * An item's split of a gas by source: the country's in the scope, else the world's, then the
 * same in the other scope (as intensities fall back); undefined when none has the gas.
 */
export const gasSplitOf = (
  breakdown: Breakdown,
  iso3: string,
  code: string,
  scope: Scope,
  gas: Gas,
): Partial<Record<EmissionSource, number>> | undefined => {
  const lookups: (GasSplit | undefined)[] = [scope, OTHER_SCOPE[scope]].flatMap((s) => [
    breakdown.byCountry[iso3]?.[code]?.[s],
    breakdown.world[code]?.[s],
  ]);
  return lookups.map((l) => l?.[gas]).find((split) => split !== undefined);
};

/** One gas and source of a country's emissions, and each item's share of the gas from it. */
interface SourceShares {
  gas: Gas;
  source: EmissionSource;
  shares: ItemVector;
  /** The items with a share, the only ones a cut changes. */
  items: Int32Array;
}

const splitCache = memoPer<PreparedCountry, readonly SourceShares[]>();

/** A country's split of every item's gases by source, for the sources some item has. */
export const countrySplit = (
  pc: PreparedCountry,
  prepared: Prepared,
  scope: Scope,
): readonly SourceShares[] =>
  splitCache(pc, scope, () => {
    const { breakdown } = prepared.data;
    return GASES.flatMap((gas) => {
      const splits = prepared.items.map((item) =>
        gasSplitOf(breakdown, pc.country.iso3, String(item.code), scope, gas),
      );
      return EMISSION_SOURCES.map((source) => {
        const shares = Float64Array.from(splits, (s) => s?.[source] ?? 0);
        return {
          gas,
          source,
          shares,
          items: Int32Array.from(
            range(0, shares.length - 1).filter((i) => (shares[i] as number) !== 0),
          ),
        };
      }).filter((s) => s.shares.some((v) => v > 0));
    });
  });

/** A practice's share of the targeted emissions that could adopt it in a country. */
export const applicableIn = (practice: Practice, iso3: string): number =>
  practice.applicable[iso3] ?? practice.applicable['World'] ?? 0;

export interface PracticeCut {
  practice: Practice;
  /** adoption × applicable × reduction: the share of the targeted emissions removed. */
  cut: number;
}

/** The practices adopted in a country and the share of their targeted emissions each removes. */
export const practiceCuts = (
  practices: Partial<Practices>,
  adoption: (id: string) => number,
  iso3: string,
  band: Band,
): PracticeCut[] =>
  PRACTICES.flatMap((id) => {
    const practice = practices[id];
    const cut = practice
      ? adoption(id) * applicableIn(practice, iso3) * bandValue(practice.reduction, band)
      : 0;
    return practice && cut > 0 ? [{ practice, cut: Math.min(1, cut) }] : [];
  });

const actsOn = (p: Practice, gas: Gas, source: EmissionSource, group: Group): boolean =>
  p.gases.includes(gas) &&
  p.sources.includes(source) &&
  (p.groups === undefined || p.groups.includes(group));

/**
 * Share of a source's emissions the practices remove for a food group. Practices on the same
 * source combine multiplicatively: each acts on what the others leave, 1 − Π(1 − cut).
 */
export const combinedCut = (
  cuts: readonly PracticeCut[],
  gas: Gas,
  source: EmissionSource,
  group: Group,
): number =>
  1 -
  cuts.reduce((left, c) => (actsOn(c.practice, gas, source, group) ? left * (1 - c.cut) : left), 1);

const GROUPS: readonly Group[] = [...ANIMAL_GROUPS, ...PLANT_GROUPS];
const GROUP_INDEX = new Map(GROUPS.map((g, k) => [g, k]));

/** Each item's index in GROUPS, for the per-group cuts below. */
export const groupIndices = (groups: readonly Group[]): Int32Array =>
  Int32Array.from(groups, (g) => GROUP_INDEX.get(g) ?? 0);

const maskCache = new WeakMap<Practice, Uint8Array>();

/** 1 for each group of GROUPS a practice acts on (all when it names none), once per practice. */
const groupMask = (p: Practice): Uint8Array => {
  const found = maskCache.get(p);
  if (found) return found;
  const mask = Uint8Array.from(GROUPS, (g) =>
    p.groups === undefined || p.groups.includes(g) ? 1 : 0,
  );
  maskCache.set(p, mask);
  return mask;
};

/**
 * The fraction of each item's intensity of each gas that the practices remove: the sum over
 * sources of the source's share of the gas times the share of it removed (combinedCut, with
 * each practice's groups read from a mask). The vectors are built in place, as this runs for
 * every country and band on each slider move.
 */
export const intensityCuts = (
  split: readonly SourceShares[],
  cuts: readonly PracticeCut[],
  itemGroups: Int32Array,
): Record<Gas, ItemVector> => {
  const n = itemGroups.length;
  const out = Object.fromEntries(GASES.map((g) => [g, zeros(n)])) as Record<Gas, ItemVector>;
  const masks = cuts.map((c) => groupMask(c.practice));
  const byGroup = new Float64Array(GROUPS.length);
  split.forEach(({ gas, source, shares, items }) => {
    const acting = cuts.flatMap((c, k) =>
      c.practice.gases.includes(gas) && c.practice.sources.includes(source) ? [k] : [],
    );
    if (acting.length === 0) return;
    for (let g = 0; g < GROUPS.length; g++) {
      let left = 1;
      for (const k of acting)
        if ((masks[k] as Uint8Array)[g] === 1) left *= 1 - (cuts[k] as PracticeCut).cut;
      byGroup[g] = 1 - left;
    }
    // An item without a share would only add zero.
    const target = out[gas];
    for (const i of items)
      target[i] =
        (target[i] as number) +
        (shares[i] as number) * (byGroup[itemGroups[i] as number] as number);
  });
  return out;
};

const groupCache = memoPer<Prepared, Int32Array>();
const groupsOf = (prepared: Prepared): Int32Array =>
  groupCache(prepared, 'groups', () => groupIndices(prepared.items.map((item) => item.group)));

const practiceCache = memoLatest<PreparedCountry, Record<Band, Record<Gas, ItemVector>>>();

/** The scope and the practices' adoptions, which the cuts are kept by. */
export const practicesKey = (scope: Scope, adoption: (id: string) => number): string =>
  `${scope}|${PRACTICES.map((id) => adoption(id)).join(',')}`;

/**
 * Share of each item's intensity the practices remove, by band; kept while only the diet moves.
 * `key` is practicesKey, which a run computes once for every country.
 */
export const practiceCutsOf = (
  pc: PreparedCountry,
  prepared: Prepared,
  scope: Scope,
  adoption: (id: string) => number,
  key: string = practicesKey(scope, adoption),
): Record<Band, Record<Gas, ItemVector>> =>
  practiceCache(pc, key, () =>
    bandRecord((band) =>
      intensityCuts(
        countrySplit(pc, prepared, scope),
        practiceCuts(prepared.data.practices, adoption, pc.country.iso3, band),
        groupsOf(prepared),
      ),
    ),
  );
