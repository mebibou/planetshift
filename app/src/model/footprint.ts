import {
  ANIMAL_GROUPS,
  GASES,
  type FeedMethod,
  type Gas,
  type GasVector,
  type Scope,
} from '../data/types';
import { chainIntensities } from './chain';
import { countryCakes, countryIntensities } from './emissions';
import { feedByGroup, feedSharesOf } from './feed';
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
    const code = String(item.code);
    const t = pc.emitting[i] as number;
    const kept = 1 - crushedShare(pc, prepared, code);
    return t > 0 ? ((clearing[code] ?? 0) * KG_PER_T * kept) / t : 0;
  });
};

const crushedCache = memoPer<Prepared, Map<string, number>>();

/**
 * The share of the world's production of each oilseed that is crushed into oil and cake: the
 * world's, as raw seed is traded and crushed where it is imported (Brazil's soybeans in China).
 */
const worldCrushed = (prepared: Prepared): Map<string, number> =>
  crushedCache(prepared, 'crushed', () => {
    const totals = (code: string, field: 'production' | 'processing') =>
      prepared.countries.reduce((a, pc) => a + (pc.rows.get(code)?.[field] ?? 0), 0);
    return new Map(
      Object.keys(prepared.data.land.crush ?? {}).map((code) => {
        const produced = totals(code, 'production');
        return [code, produced > 0 ? Math.min(1, totals(code, 'processing') / produced) : 0];
      }),
    );
  });

/** The share of an oilseed's production crushed into oil and cake, the world's; 0 for other items. */
const crushedShare = (_pc: PreparedCountry, prepared: Prepared, code: string): number =>
  worldCrushed(prepared).get(code) ?? 0;

/**
 * What crushing oilseeds emits, pooled over the world, as oil and cake are traded like each
 * other: kg of CO₂ of the clearing per tonne of each oil eaten (by item index), and kg of each
 * gas per tonne of each animal group's production from the cake it eats (the cake's share of
 * the farm emissions, after the levers' cuts, and of the clearing).
 */
export const crushPools = (
  prepared: Prepared,
  scope: Scope,
  method: FeedMethod,
  cut: IntensityCut,
): { oil: Map<number, number>; cake: FeedPerTonne } => {
  const crush = prepared.data.land.crush ?? {};
  const oilKg = new Map<number, number>();
  const cakeKg = ANIMAL_GROUPS.map(() => ({ co2: 0, ch4: 0, n2o: 0, hfc: 0 }));
  const toCake = (seed: string, kg: GasVector) => {
    const shares = feedSharesOf(prepared.data.feed, method, 'World', seed) ?? {};
    ANIMAL_GROUPS.forEach((group, k) => {
      const share = shares[group] ?? 0;
      GASES.forEach((g) => ((cakeKg[k] as GasVector)[g] += kg[g] * share));
    });
  };
  prepared.countries.forEach((pc) => {
    const clearing = prepared.data.deforestation?.byCountry[pc.country.iso3] ?? {};
    Object.entries(crush).forEach(([seed, { oil, oilShare }]) => {
      const crushed = (clearing[seed] ?? 0) * KG_PER_T * crushedShare(pc, prepared, seed);
      const index = prepared.indexOf.get(oil);
      if (index !== undefined && crushed > 0) {
        oilKg.set(index, (oilKg.get(index) ?? 0) + crushed * oilShare);
      }
      toCake(seed, { co2: crushed * (1 - oilShare), ch4: 0, n2o: 0, hfc: 0 });
    });
    const cakes = countryCakes(pc, prepared, scope);
    const cuts = cut(pc);
    cakes.kg.forEach((kg, k) => {
      const i = cakes.index[k] as number;
      const kept = (g: Gas) => 1 - (i >= 0 ? (cuts?.[g][i] ?? 0) : 0);
      toCake(cakes.codes[k] as string, {
        co2: kg.co2 * kept('co2'),
        ch4: kg.ch4 * kept('ch4'),
        n2o: kg.n2o * kept('n2o'),
        hfc: 0,
      });
    });
  });
  const groupT = ANIMAL_GROUPS.map((_, k) =>
    prepared.countries.reduce((a, pc) => a + (groupTonnes(pc, prepared)[k] as number), 0),
  );
  const eaten = (i: number) =>
    prepared.countries.reduce(
      (a, pc) => a + (pc.food[i] as number) * (pc.multipliers[i] as number),
      0,
    );
  return {
    oil: new Map([...oilKg].map(([i, kg]) => [i, eaten(i) > 0 ? kg / eaten(i) : 0])),
    cake: cakeKg.map((kg, k) => perTonne(kg, groupT[k] as number)),
  };
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
    const out = { co2: 0, ch4: 0, n2o: 0, hfc: 0 };
    for (let i = 0; i < fed.length; i++) {
      const t = fed[i] as number;
      if (t > 0) {
        out.co2 += t * (intensity.co2[i] as number);
        out.ch4 += t * (intensity.ch4[i] as number);
        out.n2o += t * (intensity.n2o[i] as number);
        out.hfc += t * (intensity.hfc[i] as number);
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

/**
 * What a footprint needs: each country's intensity of what it uses (its own for the share it
 * produces, its imports' for the rest), and the feed per tonne of each animal group, its own
 * (fed what it uses) and that of the animal products it imports.
 */
export interface FootprintFrame {
  consumed: readonly ByGas[];
  feed: { own: readonly FeedPerTonne[]; imported: readonly ByGas[] };
}

/** A country's intensity of what it uses: `own` for the share it produces, `imports` for the rest. */
const consumedIntensity = (own: ByGas, imports: ByGas, share: ItemVector): ByGas => {
  const out = zerosByGas(share.length);
  for (const g of GASES) {
    for (let i = 0; i < share.length; i++) {
      const s = share[i] as number;
      out[g][i] = (1 - s) * (own[g][i] as number) + s * (imports[g][i] as number);
    }
  }
  return out;
};

export const footprintFrame = (
  prepared: Prepared,
  scope: Scope,
  method: FeedMethod,
  cut: IntensityCut,
): FootprintFrame => {
  const own = prepared.countries.map((pc) => producedIntensity(pc, prepared, scope, cut(pc)));
  const world = worldIntensity(prepared, own);
  const pools = crushPools(prepared, scope, method, cut);
  const sources = originsOf(prepared);
  const byGas = Object.fromEntries(GASES.map((g) => [g, own.map((v) => v[g])])) as Record<
    Gas,
    ItemVector[]
  >;
  const consumed = prepared.countries.map((pc, c) =>
    withOil(
      consumedIntensity(
        own[c] as ByGas,
        importIntensity(byGas, world, sources[c] as ItemOrigins),
        importShares(pc, prepared),
      ),
      pools.oil,
    ),
  );
  const feed = feedPerTonne(prepared, method, consumed);
  const withCake = (f: FeedPerTonne): FeedPerTonne =>
    f.map((v, k) => addGas(v, pools.cake[k] as GasVector));
  const fedOwn = feed.own.map(withCake);
  const fedWorld = withCake(feed.world);
  return {
    consumed,
    feed: {
      own: fedOwn,
      imported: prepared.countries.map((_, c) =>
        importedFeed(prepared, fedOwn, fedWorld, sources[c] as ItemOrigins),
      ),
    },
  };
};

/**
 * A country's origins of each item, flat: item i's origins are `index` and `share` from
 * `start[i]` to `start[i + 1]`, and `rest[i]` is the share left to the world.
 */
interface ItemOrigins {
  start: Int32Array;
  index: Int32Array;
  share: Float64Array;
  rest: Float64Array;
}

const originsCache = memoPer<Prepared, ItemOrigins[]>();

/** Each country's origins of each item it imports, by country index; none without the file. */
const originsOf = (prepared: Prepared): ItemOrigins[] =>
  originsCache(prepared, 'origins', () => {
    const position = new Map(prepared.countries.map((pc, c) => [pc.country.iso3, c]));
    return prepared.countries.map((pc) => {
      const own = prepared.data.origins?.byCountry[pc.country.iso3] ?? {};
      const lists = prepared.items.map((item) =>
        (own[String(item.code)] ?? []).flatMap(([iso3, share]): [number, number][] => {
          const c = position.get(iso3);
          return c === undefined ? [] : [[c, share]];
        }),
      );
      const ends = lists.reduce<number[]>(
        (acc, l) => [...acc, (acc[acc.length - 1] ?? 0) + l.length],
        [0],
      );
      const start = Int32Array.from(ends);
      const flat = lists.flat();
      return {
        start,
        index: Int32Array.from(flat, ([c]) => c),
        share: Float64Array.from(flat, ([, v]) => v),
        rest: Float64Array.from(lists, (l) => 1 - l.reduce((a, [, v]) => a + v, 0)),
      };
    });
  });

/**
 * A country's import intensity: its origins' own, by share, and the world's for the rest.
 * `byGas[g][c]` is country c's intensity of gas g. Plain loops over typed arrays, as this runs for
 * every country whenever the levers change.
 */
const importIntensity = (
  byGas: Record<Gas, readonly ItemVector[]>,
  world: ByGas,
  o: ItemOrigins,
): ByGas => {
  const n = o.rest.length;
  const out = zerosByGas(n);
  for (const g of GASES) {
    const countries = byGas[g];
    const w = world[g];
    const target = out[g];
    for (let i = 0; i < n; i++) {
      let v = (o.rest[i] as number) * (w[i] as number);
      for (let k = o.start[i] as number; k < (o.start[i + 1] as number); k++) {
        v +=
          (o.share[k] as number) * ((countries[o.index[k] as number] as ItemVector)[i] as number);
      }
      target[i] = v;
    }
  }
  return out;
};

/**
 * kg of each gas from the feed behind each tonne of each animal item a country imports: its
 * origins' feed per tonne of the item's group, by share, and the world's for the rest.
 */
const importedFeed = (
  prepared: Prepared,
  fedOwn: readonly FeedPerTonne[],
  fedWorld: FeedPerTonne,
  o: ItemOrigins,
): ByGas => {
  const groups = animalIndex(prepared);
  const n = o.rest.length;
  const out = zerosByGas(n);
  for (const g of GASES) {
    const target = out[g];
    for (let i = 0; i < n; i++) {
      const k = groups[i] as number;
      if (k >= 0) {
        let v = (o.rest[i] as number) * (fedWorld[k] as GasVector)[g];
        for (let j = o.start[i] as number; j < (o.start[i + 1] as number); j++) {
          v +=
            (o.share[j] as number) *
            ((fedOwn[o.index[j] as number] as FeedPerTonne)[k] as GasVector)[g];
        }
        target[i] = v;
      }
    }
  }
  return out;
};

/** An intensity with each oil's pooled clearing per tonne eaten added to its CO₂. */
const withOil = (intensity: ByGas, oil: Map<number, number>): ByGas => {
  const co2 = Float64Array.from(intensity.co2);
  oil.forEach((kg, i) => {
    co2[i] = (co2[i] as number) + kg;
  });
  return { ...intensity, co2 };
};

const addGas = (a: GasVector, b: GasVector): GasVector => ({
  co2: a.co2 + b.co2,
  ch4: a.ch4 + b.ch4,
  n2o: a.n2o + b.n2o,
  hfc: a.hfc + b.hfc,
});

const groupIndexCache = memoPer<Prepared, Int32Array>();

/** Each item's index in ANIMAL_GROUPS, −1 for a plant, once per dataset. */
const animalIndex = (prepared: Prepared): Int32Array =>
  groupIndexCache(prepared, 'animal', () =>
    Int32Array.from(prepared.items, (item) =>
      (ANIMAL_GROUPS as readonly string[]).indexOf(item.group),
    ),
  );

/**
 * kg of each gas a country's food supply emits, `supply` in farm tonnes by item, at its intensity
 * of what it uses, and for animal products the feed behind them: its own for the share it
 * produces, its imports' for the rest. Plain loops, as this runs for every country of a run.
 */
export const footprintOf = (
  c: number,
  prepared: Prepared,
  supply: ItemVector,
  imported: ItemVector,
  frame: FootprintFrame,
): GasVector => {
  const used = frame.consumed[c] as ByGas;
  const feed = frame.feed.own[c] as FeedPerTonne;
  const fedImported = frame.feed.imported[c] as ByGas;
  const groups = animalIndex(prepared);
  const out = { co2: 0, ch4: 0, n2o: 0, hfc: 0 };
  for (let i = 0; i < supply.length; i++) {
    const q = supply[i] as number;
    if (q !== 0) {
      const s = imported[i] as number;
      const k = groups[i] as number;
      for (const g of GASES) {
        const fed =
          k < 0 ? 0 : (1 - s) * (feed[k] as GasVector)[g] + s * (fedImported[g][i] as number);
        out[g] += q * ((used[g][i] as number) + fed);
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
