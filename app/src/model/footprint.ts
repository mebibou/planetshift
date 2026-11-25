import {
  ANIMAL_GROUPS,
  GASES,
  type FeedMethod,
  type Gas,
  type GasVector,
  type Scope,
} from '../data/types';
import { chainIntensities } from './chain';
import { countryIntensities } from './emissions';
import { feedByGroup } from './feed';
import type { Prepared, PreparedCountry } from './prepare';
import { memoLatest, memoPer, type ItemVector } from './util';

/** kg of each gas per tonne of each item. */
type ByGas = Record<Gas, ItemVector>;

/** The share of each item's intensity of each gas a lever removes, in a country. */
export type IntensityCut = (pc: PreparedCountry) => ByGas | null;

const KG_PER_T = 1000;

const zerosByGas = (n: number): ByGas =>
  Object.fromEntries(GASES.map((g) => [g, new Float64Array(n)])) as ByGas;

/**
 * A country's kg of each gas per tonne of each item it produces: the farm's (after the levers'
 * cuts, when given), the chain after the farm, and, for CO₂, the clearing for it.
 */
export const producedIntensity = (
  pc: PreparedCountry,
  prepared: Prepared,
  scope: Scope,
  cut: ByGas | null,
): ByGas => {
  const total = baseIntensity(pc, prepared, scope);
  const farm = countryIntensities(pc, prepared, scope).kgPerTonne;
  return cut
    ? (Object.fromEntries(
        GASES.map((g) => [
          g,
          total[g].map((v, i) => v - (farm[g][i] as number) * (cut[g][i] as number)),
        ]),
      ) as ByGas)
    : total;
};

const baseIntensityCache = memoPer<PreparedCountry, ByGas>();

/** A country's farm, chain and clearing intensities together, without the levers, once per scope. */
const baseIntensity = (pc: PreparedCountry, prepared: Prepared, scope: Scope): ByGas =>
  baseIntensityCache(pc, scope, () => {
    const farm = countryIntensities(pc, prepared, scope).kgPerTonne;
    const chain = prepared.data.chain ? chainIntensities(pc, prepared, prepared.data.chain) : null;
    const cleared = clearingPerTonne(pc, prepared);
    const chainAt = (g: Gas, i: number) =>
      chain ? (chain.fossilIndustry[g][i] as number) + (chain.other[g][i] as number) : 0;
    return Object.fromEntries(
      GASES.map((g) => [
        g,
        Float64Array.from(
          prepared.items,
          (_, i) =>
            (farm[g][i] as number) + chainAt(g, i) + (g === 'co2' ? (cleared[i] as number) : 0),
        ),
      ]),
    ) as ByGas;
  });

/** kg of CO₂ from clearing forest per tonne a country produces of each item. */
const clearingPerTonne = (pc: PreparedCountry, prepared: Prepared): ItemVector => {
  const clearing = prepared.data.deforestation?.byCountry[pc.country.iso3] ?? {};
  return Float64Array.from(prepared.items, (item, i) => {
    const t = pc.emitting[i] as number;
    return t > 0 ? ((clearing[String(item.code)] ?? 0) * KG_PER_T) / t : 0;
  });
};

/** Each item's intensity averaged over the countries that produce it, weighted by production. */
export const worldIntensity = (prepared: Prepared, intensities: readonly ByGas[]): ByGas => {
  const n = prepared.items.length;
  const out = zerosByGas(n);
  prepared.countries.forEach((pc, c) => {
    const own = intensities[c] as ByGas;
    GASES.forEach((g) => {
      for (let i = 0; i < n; i++) {
        out[g][i] = (out[g][i] as number) + (pc.emitting[i] as number) * (own[g][i] as number);
      }
    });
  });
  GASES.forEach((g) => {
    for (let i = 0; i < n; i++) {
      const t = prepared.worldEmitting[i] as number;
      out[g][i] = t > 0 ? (out[g][i] as number) / t : 0;
    }
  });
  return out;
};

/** kg of each gas from the feed of one tonne of each animal group's production. */
type FeedPerTonne = readonly GasVector[];

const groupTonnesCache = memoPer<PreparedCountry, number[]>();

/** A country's production of each animal group, tonnes, once per country. */
const groupTonnes = (pc: PreparedCountry, prepared: Prepared): number[] =>
  groupTonnesCache(pc, 'groups', () =>
    ANIMAL_GROUPS.map((group) =>
      prepared.items.reduce(
        (a, item, i) => a + (item.group === group ? (pc.emitting[i] as number) : 0),
        0,
      ),
    ),
  );

/** kg of each gas from what each group is fed, at a country's intensities. */
const feedKg = (split: readonly ItemVector[], intensity: ByGas): GasVector[] =>
  split.map((fed) => {
    const out = { co2: 0, ch4: 0, n2o: 0 };
    for (let i = 0; i < fed.length; i++) {
      const t = fed[i] as number;
      if (t > 0) {
        out.co2 += t * (intensity.co2[i] as number);
        out.ch4 += t * (intensity.ch4[i] as number);
        out.n2o += t * (intensity.n2o[i] as number);
      }
    }
    return out;
  });

/** A country's feed emissions and its animal production, by group: the parts of a per-tonne figure. */
const feedParts = (
  pc: PreparedCountry,
  prepared: Prepared,
  method: FeedMethod,
  intensity: ByGas,
): { kg: GasVector[]; t: number[] } => ({
  kg: feedKg(feedByGroup(pc, prepared, method), intensity),
  t: groupTonnes(pc, prepared),
});

const perTonne = (kg: GasVector, t: number): GasVector =>
  Object.fromEntries(GASES.map((g) => [g, t > 0 ? kg[g] / t : 0])) as GasVector;

/** Feed emissions per tonne of each group's production, a country's and the world's. */
export const feedPerTonne = (
  prepared: Prepared,
  method: FeedMethod,
  intensities: readonly ByGas[],
): { own: FeedPerTonne[]; world: FeedPerTonne } => {
  const parts = prepared.countries.map((pc, c) =>
    feedParts(pc, prepared, method, intensities[c] as ByGas),
  );
  const world = ANIMAL_GROUPS.map((_, k) =>
    perTonne(
      Object.fromEntries(
        GASES.map((g) => [g, parts.reduce((a, p) => a + (p.kg[k] as GasVector)[g], 0)]),
      ) as GasVector,
      parts.reduce((a, p) => a + (p.t[k] as number), 0),
    ),
  );
  return {
    own: parts.map((p) =>
      ANIMAL_GROUPS.map((_, k) => perTonne(p.kg[k] as GasVector, p.t[k] as number)),
    ),
    world,
  };
};

const importCache = memoPer<PreparedCountry, ItemVector>();

/** The share of each item's supply a country imports: imports over production and imports. */
export const importShares = (pc: PreparedCountry, prepared: Prepared): ItemVector =>
  importCache(pc, 'imports', () =>
    Float64Array.from(prepared.items, (item) => {
      const row = pc.rows.get(String(item.code));
      const total = row ? row.production + row.imports : 0;
      return row && total > 0 ? row.imports / total : 0;
    }),
  );

/** What a footprint needs about the world: intensities by country, the world's, the feed. */
export interface FootprintFrame {
  own: readonly ByGas[];
  world: ByGas;
  feed: { own: FeedPerTonne[]; world: FeedPerTonne };
}

export const footprintFrame = (
  prepared: Prepared,
  scope: Scope,
  method: FeedMethod,
  cut: IntensityCut,
): FootprintFrame => {
  const own = prepared.countries.map((pc) => producedIntensity(pc, prepared, scope, cut(pc)));
  return { own, world: worldIntensity(prepared, own), feed: feedPerTonne(prepared, method, own) };
};

const groupIndexCache = memoPer<Prepared, Int32Array>();

/** Each item's index in ANIMAL_GROUPS, −1 for a plant, once per dataset. */
const animalIndex = (prepared: Prepared): Int32Array =>
  groupIndexCache(prepared, 'animal', () =>
    Int32Array.from(prepared.items, (item) =>
      (ANIMAL_GROUPS as readonly string[]).indexOf(item.group),
    ),
  );

/**
 * kg of each gas a country's food supply emits, `supply` in farm tonnes by item: the part it
 * produces at its own intensities, the part it imports at the world's, and for animal products
 * the feed behind them, likewise. Plain loops, as this runs twice for every country of a run.
 */
export const footprintOf = (
  c: number,
  prepared: Prepared,
  supply: ItemVector,
  imported: ItemVector,
  frame: FootprintFrame,
): GasVector => {
  const own = frame.own[c] as ByGas;
  const feed = frame.feed.own[c] as FeedPerTonne;
  const groups = animalIndex(prepared);
  const out = { co2: 0, ch4: 0, n2o: 0 };
  for (let i = 0; i < supply.length; i++) {
    const q = supply[i] as number;
    if (q !== 0) {
      const s = imported[i] as number;
      const k = groups[i] as number;
      for (const g of GASES) {
        const fed =
          k < 0
            ? 0
            : (1 - s) * (feed[k] as GasVector)[g] + s * (frame.feed.world[k] as GasVector)[g];
        out[g] += q * ((1 - s) * (own[g][i] as number) + s * (frame.world[g][i] as number) + fed);
      }
    }
  }
  return out;
};

const baseCache = memoPer<Prepared, FootprintFrame>();
const leversCache = memoLatest<Prepared, FootprintFrame>();
const beforeCache = memoPer<PreparedCountry, GasVector>();

/** A country's food supply in farm tonnes: what is eaten times the supply each tonne needs. */
const eatenCache = memoPer<PreparedCountry, ItemVector>();
const eatenBase = (pc: PreparedCountry): ItemVector =>
  eatenCache(pc, 'eaten', () => pc.food.map((t, i) => t * (pc.multipliers[i] as number)));

const perPerson = (v: GasVector, people: number): GasVector =>
  Object.fromEntries(GASES.map((g) => [g, people > 0 ? v[g] / people : 0])) as GasVector;

/**
 * Each country's food footprint per person, kg of each gas a year, today and its change with the
 * levers: today's supply at today's intensities, and the supply after the diet and less waste
 * (`change`, farm tonnes by country) at the intensities after the levers' cuts (`cut`, null
 * without any).
 */
export const foodFootprints = (
  prepared: Prepared,
  scope: Scope,
  method: FeedMethod,
  change: Readonly<Record<string, ItemVector>>,
  cut: { key: string; of: IntensityCut } | null,
): Map<string, { footprint: GasVector; footprintChange: GasVector }> => {
  const base = baseCache(prepared, `${scope}|${method}`, () =>
    footprintFrame(prepared, scope, method, () => null),
  );
  const after = cut
    ? leversCache(prepared, `${scope}|${method}|${cut.key}`, () =>
        footprintFrame(prepared, scope, method, cut.of),
      )
    : base;
  return new Map(
    prepared.countries.map((pc, c) => {
      const supply = eatenBase(pc);
      const own = change[pc.country.iso3];
      const changed = own ? supply.map((t, i) => t + (own[i] as number)) : supply;
      const imported = importShares(pc, prepared);
      const before = beforeCache(pc, `${scope}|${method}`, () =>
        perPerson(footprintOf(c, prepared, supply, imported, base), pc.population),
      );
      const later = perPerson(footprintOf(c, prepared, changed, imported, after), pc.population);
      return [
        pc.country.iso3,
        {
          footprint: before,
          footprintChange: Object.fromEntries(
            GASES.map((g) => [g, later[g] - before[g]]),
          ) as GasVector,
        },
      ];
    }),
  );
};
