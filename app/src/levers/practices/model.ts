import { GASES, type Gas, type GasVector, type Scope } from '../../data/types';
import { bandRecord, bandValue } from '../../model/bands';
import type { Band } from '../../model/climate';
import { countryIntensities, OTHER_SCOPE } from '../../model/emissions';
import { GROUPS, groupIndicesOf, type Prepared, type PreparedCountry } from '../../model/prepare';
import { cachedIn, memoLatest, memoPer, range, zeros, type ItemVector } from '../../model/util';
import {
  EMISSION_SOURCES,
  PRACTICES,
  type Breakdown,
  type Electrified,
  type EmissionSource,
  type Practice,
  type Practices,
} from './data';

type GasSplit = Partial<Record<Gas, Partial<Record<EmissionSource, number>>>>;

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
export interface SourceShares {
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
  /** adoption × applicable × net reduction: the share of the targeted emissions removed (added below 0). */
  cut: number;
}

const countryValue = (table: Record<string, number>, iso3: string, fallback: number): number =>
  table[iso3] ?? table['World'] ?? fallback;

/** kg of the grid's CO₂ per kg of fuel CO₂ replaced, on a world grid of `worldGrid` kg/kWh. */
export const co2PerFuelCo2 = (e: Electrified, iso3: string, worldGrid: number): number =>
  countryValue(e.kwhPerFuelCo2, iso3, 0) * countryValue(e.gridRatio, iso3, 1) * worldGrid;

/** The share of the targeted emissions a practice switches to the grid. */
const switchedShare = (practice: Practice, band: Band): number => {
  const e = practice.electrified;
  return e ? Math.max(0, bandValue(practice.reduction, band) - e.efficiency) : 0;
};

/** Below zero where the grid emits more than the fuel it replaces. */
export const netReduction = (
  practice: Practice,
  iso3: string,
  band: Band,
  worldGrid: number,
): number => {
  const e = practice.electrified;
  const grid = e ? co2PerFuelCo2(e, iso3, worldGrid) : 0;
  return bandValue(practice.reduction, band) - switchedShare(practice, band) * grid;
};

/** The practices adopted in a country and the share of their targeted emissions each removes. */
export const practiceCuts = (
  practices: Partial<Practices>,
  adoption: (id: string) => number,
  iso3: string,
  band: Band,
  worldGrid: number,
): PracticeCut[] =>
  PRACTICES.flatMap((id) => {
    const practice = practices[id];
    const cut = practice
      ? adoption(id) * applicableIn(practice, iso3) * netReduction(practice, iso3, band, worldGrid)
      : 0;
    return practice && cut !== 0 ? [{ practice, cut: Math.min(1, cut) }] : [];
  });

const maskCache = new WeakMap<Practice, Uint8Array>();

/** 1 for each group of GROUPS a practice acts on (all when it names none), once per practice. */
const groupMask = (p: Practice): Uint8Array =>
  cachedIn(maskCache, p, () =>
    Uint8Array.from(GROUPS, (g) => (p.groups === undefined || p.groups.includes(g) ? 1 : 0)),
  );

/**
 * The fraction of each item's intensity of each gas that the practices remove: the sum over
 * sources of the source's share of the gas times the share of it removed. Practices on the same
 * source combine multiplicatively, each acting on what the others leave: 1 − Π(1 − cut). The
 * vectors are built in place, as this runs for every country and band on each slider move.
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
    if (acting.length > 0) {
      for (let g = 0; g < GROUPS.length; g++) {
        let left = 1;
        for (const k of acting) {
          if ((masks[k] as Uint8Array)[g] === 1) {
            left *= 1 - (cuts[k] as PracticeCut).cut;
          }
        }
        byGroup[g] = 1 - left;
      }
      // An item without a share would only add zero.
      const target = out[gas];
      for (const i of items) {
        target[i] =
          (target[i] as number) +
          (shares[i] as number) * (byGroup[itemGroups[i] as number] as number);
      }
    }
  });
  return out;
};

const practiceCache = memoLatest<PreparedCountry, Record<Band, Record<Gas, ItemVector>>>();

/** The scope and the practices' adoptions, which the cuts are kept by. */
export const practicesKey = (
  scope: Scope,
  adoption: (id: string) => number,
  worldGrid: number,
): string => `${scope}|${worldGrid}|${PRACTICES.map((id) => adoption(id)).join(',')}`;

/**
 * Share of each item's intensity the practices remove, by band; kept while only the diet moves.
 * `key` is practicesKey, which a run computes once for every country.
 */
export const practiceCutsOf = (
  pc: PreparedCountry,
  prepared: Prepared,
  scope: Scope,
  adoption: (id: string) => number,
  worldGrid: number,
  key: string = practicesKey(scope, adoption, worldGrid),
): Record<Band, Record<Gas, ItemVector>> =>
  practiceCache(pc, key, () =>
    bandRecord((band) =>
      intensityCuts(
        countrySplit(pc, prepared, scope),
        practiceCuts(prepared.data.practices, adoption, pc.country.iso3, band, worldGrid),
        groupIndicesOf(prepared.items),
      ),
    ),
  );

/**
 * kg of the grid's CO₂ a year that the electrified practices add back in a country, by band, on
 * the base year's production plus `change` (tonnes by item) and a world grid of `worldGrid`
 * kg/kWh: each practice's fuel CO₂ times the share it switches, times the grid's CO₂ per kg of
 * fuel CO₂.
 */
export const gridAddBack = (
  pc: PreparedCountry,
  prepared: Prepared,
  scope: Scope,
  adoption: (id: string) => number,
  change: ItemVector | undefined,
  worldGrid: number,
): Record<Band, number> => {
  const co2 = countryIntensities(pc, prepared, scope).kgPerTonne.co2;
  const kgFrom = (s: SourceShares): number => {
    let kg = 0;
    for (const i of s.items) {
      kg +=
        ((pc.emitting[i] as number) + (change?.[i] ?? 0)) *
        (co2[i] as number) *
        (s.shares[i] as number);
    }
    return kg;
  };
  const split = countrySplit(pc, prepared, scope).filter((s) => s.gas === 'co2');
  const electrified = PRACTICES.flatMap((id) => {
    const practice = prepared.data.practices[id];
    const e = practice?.electrified;
    const reach = practice ? adoption(id) * applicableIn(practice, pc.country.iso3) : 0;
    const fuel = () =>
      split.filter((s) => practice?.sources.includes(s.source)).reduce((a, s) => a + kgFrom(s), 0);
    return e && practice && reach > 0
      ? [{ practice, kg: fuel() * reach * co2PerFuelCo2(e, pc.country.iso3, worldGrid) }]
      : [];
  });
  return bandRecord((band) =>
    electrified.reduce((t, { practice, kg }) => t + kg * switchedShare(practice, band), 0),
  );
};

/**
 * The yearly change to the grid's CO₂ added back as the grid moves from today's: the add-back
 * times the grid's ratio to today's less one, scaled like farm emissions and ramped in like the
 * adoption.
 */
export const gridPath = (
  addBack: number,
  ratio: readonly number[],
  years: readonly number[],
  scale: (gas: Gas, year: number) => number,
  shareAt: (year: number) => number,
): GasVector[] =>
  years.map((y, k) => ({
    co2: addBack * ((ratio[k] ?? 1) - 1) * scale('co2', y) * shareAt(y),
    ch4: 0,
    n2o: 0,
    hfc: 0,
  }));

/** Each item's share of a country's CO₂ that comes from grid electricity, in the scope. */
export const electricityShare = (
  pc: PreparedCountry,
  prepared: Prepared,
  scope: Scope,
): ItemVector =>
  countrySplit(pc, prepared, scope).find((s) => s.gas === 'co2' && s.source === 'electricity')
    ?.shares ?? zeros(prepared.items.length);
