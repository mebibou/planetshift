import {
  ANIMAL_GROUPS,
  GASES,
  type AnimalGroup,
  type Climate,
  type Ssp,
  type CauseWarming,
  type Gas,
  type GasVector,
  type CountedCause,
  type Item,
  type LeverCause,
  type ModelData,
  type Scope,
  type Series,
} from '../data/types';
import {
  adoptionOf,
  COUNTED_CAUSES,
  DIET_CAUSE,
  FAMILIES,
  FARM_FAMILIES,
  LEVER_CAUSES,
} from '../levers/registry';
import { MODULES } from '../levers/modules';
import type {
  CountryContext,
  CountryPart,
  FarmGrid,
  LeverModule,
  RunContext,
  Stage,
  SupplyChain,
  WorldContext,
  WorldPart,
} from '../levers/types';
import {
  GWP100,
  type Baseline,
  type CountryResult,
  type Options,
  type Scenario,
  type ScenarioResult,
  type Summary,
} from './api';
import { shapley } from './attribution';
import { bandRecord } from './bands';
import {
  BANDS,
  populationAdjustmentEmissions,
  sumOfGases,
  warmingByGas,
  warmingFrom,
  type Band,
} from './climate';
import { foodChange, perCapitaPerDay } from './diet';
import {
  cakeEmissions,
  cakeEmissionsChange,
  countryCakes,
  nonFoodEmissions,
  countryIntensities,
  cutCakeEmissions,
  cutEmissions,
  emissionsOf,
  worstIntensity,
} from './emissions';
import { animalUse, feedChange, feedSharesOf, groupProductionChange } from './feed';
import { addLand, countryLand, landChangeOf, NO_LAND, type CakeDemand } from './land';
import { clipChange, locateAll } from './location';
import { mammalsOf, NO_MAMMALS } from './mammals';
import { speciesOf } from './species';
import { groupTotals, prepare, type Prepared, type PreparedCountry } from './prepare';
import { baselineScale, builtUp, ramp, tabulate, type Scale } from './timePath';
import {
  END_YEAR,
  FIRST_YEAR,
  addGas,
  addSeries,
  addVectors,
  gasVector,
  memoLatest,
  memoPer,
  range,
  recordFrom,
  sum,
  valueAt,
  zeros,
  zerosOn,
  ZERO_GAS,
  type ItemVector,
} from './util';

export { END_YEAR, FIRST_YEAR };

type ByCountry = Readonly<Record<string, ItemVector>>;

const recordOf = (
  countries: readonly PreparedCountry[],
  vectors: readonly ItemVector[],
): ByCountry =>
  Object.fromEntries(countries.map((pc, c) => [pc.country.iso3, vectors[c] as ItemVector]));

/**
 * Clips each country's change (in the order of the countries) so its emitting production
 * (production − processing, plus any change already made) stays at or above zero, which also
 * keeps production at or above zero, and lists where that bit.
 */
const clipAll = (
  countries: readonly PreparedCountry[],
  change: readonly ItemVector[],
  emitting: readonly ItemVector[],
): { change: ItemVector[]; clipped: string[] } => {
  const results = change.map((v, c) => clipChange(emitting[c] as ItemVector, v));
  return {
    change: results.map((r) => r.change),
    clipped: countries.flatMap((pc, c) => (results[c]?.clipped ? [pc.country.iso3] : [])),
  };
};

/** A group's relative change, no more than the whole group. */
const atLeastAll = (change: Record<AnimalGroup, number>): Record<AnimalGroup, number> =>
  recordFrom(ANIMAL_GROUPS, (g) => Math.max(-1, change[g]));

const animalCache = memoPer<readonly Item[], Uint8Array>();
/** 1 for each animal item, 0 for a plant, once per item list. */
const animalMask = (items: readonly Item[]): Uint8Array =>
  animalCache(items, 'animal', () => Uint8Array.from(items, (item) => (item.animal ? 1 : 0)));

/**
 * Change in production at the full shift, tonnes by country and item, and where it was clipped.
 * `chain` changes what is used once the diet has shifted, the supply each tonne of use needs and
 * the losses avoided (less waste, waste.md); `food` is the diet's change in food supply alone,
 * as less waste leaves what is eaten unchanged; `dietFood`, when given, is that change already
 * computed for the same scenario. Countries are held in lists in their prepared order, and
 * vectors are built in loops, as this runs on every move of the diet or less waste.
 */
export const productionChanges = (
  prepared: Prepared,
  scenario: Scenario,
  options: Options,
  chain: SupplyChain = {},
  dietFood?: ByCountry,
): { food: ByCountry; change: ByCountry; clipped: string[] } => {
  const { countries, items, worldEmitting } = prepared;
  const n = items.length;
  const animal = animalMask(items);
  const multipliers = countries.map((pc) => chain.multipliers?.(pc) ?? pc.multipliers);
  const avoided = chain.avoidedLosses ? countries.map(chain.avoidedLosses) : null;
  const use = animalUse(prepared, options.feed);
  const { scale } = use;
  /**
   * Supply change of the animal (`want` 1) or plant (0) items from their change in end use
   * (`endUse` plus `extra`), less the losses no longer incurred.
   */
  const toSupply = (c: number, want: 0 | 1, endUse: ItemVector, extra?: ItemVector) => {
    const m = multipliers[c] as ItemVector;
    const lost = avoided?.[c];
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (animal[i] === want) {
        const d = extra ? (endUse[i] as number) + (extra[i] as number) : (endUse[i] as number);
        const supply = lost ? d * (m[i] as number) - (lost[i] as number) : d * (m[i] as number);
        out[i] = supply * (scale[i] as number);
      }
    }
    return out;
  };
  const emitting = countries.map((pc) => pc.emitting);
  const foodList = countries.map(
    (pc) =>
      (dietFood?.[pc.country.iso3] as ItemVector | undefined) ?? foodChange(scenario, pc, prepared),
  );
  const used = chain.used
    ? countries.map((pc, c) =>
        (chain.used as NonNullable<SupplyChain['used']>)(pc, foodList[c] as ItemVector),
      )
    : foodList;
  const located = (demand: readonly ItemVector[]) =>
    locateAll(demand, emitting, worldEmitting, options.location);
  const animals = clipAll(countries, located(used.map((u, c) => toSupply(c, 1, u))), emitting);
  /**
   * Milk and fish are feed items too (fishmeal): their feed use follows, once, the world's change
   * in the groups they feed from the change in food, so that a group removed everywhere takes
   * them all. The fish caught for meal are wild and not fed, so this does not feed back.
   */
  const fedGroups = atLeastAll(
    groupProductionChange(
      use.worldFoodBase,
      addVectors(zeros(n), ...(animals.change as ItemVector[])),
      prepared,
    ),
  );
  const fishDemand = countries.map((pc, c) => {
    const f = feedChange(pc, fedGroups, prepared, options.feed);
    const m = multipliers[c] as ItemVector;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (animal[i] === 1) {
        out[i] = (f[i] as number) * (m[i] as number) * (scale[i] as number);
      }
    }
    return out;
  });
  const remaining = emitting.map((e, c) => addVectors(e, animals.change[c] as ItemVector));
  const fish = clipAll(
    countries,
    locateAll(fishDemand, remaining, addVectors(zeros(n), ...remaining), options.location),
    remaining,
  );
  const feed = countries.map((pc, c) =>
    feedChange(
      pc,
      atLeastAll(
        groupProductionChange(
          pc.emitting,
          addVectors(zeros(n), animals.change[c] as ItemVector, fish.change[c] as ItemVector),
          prepared,
        ),
      ),
      prepared,
      options.feed,
    ),
  );
  const plants = clipAll(
    countries,
    located(used.map((u, c) => toSupply(c, 0, u, feed[c]))),
    emitting,
  );
  return {
    food: dietFood ?? recordOf(countries, foodList),
    change: recordOf(
      countries,
      countries.map((_, c) =>
        addVectors(
          animals.change[c] as ItemVector,
          fish.change[c] as ItemVector,
          plants.change[c] as ItemVector,
        ),
      ),
    ),
    clipped: [...new Set([...animals.clipped, ...fish.clipped, ...plants.clipped])].sort(),
  };
};

const dietCache = memoLatest<Prepared, ReturnType<typeof productionChanges>>();

/** The diet shift's changes alone, kept while only the levers move. */
const dietChanges = (prepared: Prepared, scenario: Scenario, options: Options) => {
  const key = JSON.stringify([{ ...scenario, levers: {} }, options.feed, options.location]);
  return dietCache(prepared, key, () => productionChanges(prepared, scenario, options));
};

type CountryBase = Pick<
  CountryResult,
  'production' | 'emissions' | 'worstTier' | 'worstSource' | 'proteinBefore' | 'kcalBefore'
>;

const baseCache = memoPer<PreparedCountry, CountryBase>();

/** A country's base-year figures, computed once per scope. */
export const countryBase = (pc: PreparedCountry, prepared: Prepared, scope: Scope): CountryBase =>
  baseCache(pc, scope, () => {
    const intensities = countryIntensities(pc, prepared, scope);
    const worst = worstIntensity(pc.emitting, intensities);
    return {
      production: groupTotals(pc.emitting, prepared),
      emissions: addGas(
        addGas(
          emissionsOf(pc.emitting, intensities),
          cakeEmissions(countryCakes(pc, prepared, scope)),
        ),
        nonFoodEmissions(prepared, pc.country.iso3),
      ),
      worstTier: worst.tier,
      worstSource: worst.source,
      proteinBefore: perCapitaPerDay(pc.food, pc, prepared, 'protein'),
      kcalBefore: perCapitaPerDay(pc.food, pc, prepared, 'kcal'),
    };
  });

/**
 * The supply-chain changes of several modules as one: each one's use applied to the last's,
 * the losses they avoid added, the latest module's multipliers.
 */
/** A module's use applied to what the modules before it leave. */
const thenUse = (used: SupplyChain['used'], before: SupplyChain['used']): SupplyChain['used'] =>
  used && before ? (pc, food) => used(pc, before(pc, food)) : (used ?? before);

/** The losses a module avoids added to those the modules before it avoid. */
const plusLosses = (
  lost: SupplyChain['avoidedLosses'],
  before: SupplyChain['avoidedLosses'],
): SupplyChain['avoidedLosses'] =>
  lost && before ? (pc) => addVectors(before(pc), lost(pc)) : (lost ?? before);

const combine = (chains: readonly SupplyChain[]): SupplyChain =>
  chains.reduce<SupplyChain>(
    (a, c) => ({
      used: thenUse(c.used, a.used),
      multipliers: c.multipliers ?? a.multipliers,
      avoidedLosses: plusLosses(c.avoidedLosses, a.avoidedLosses),
    }),
    {},
  );

const familyOf = (m: LeverModule): string => m.family ?? m.id;

type Production = ReturnType<typeof productionChanges>;
type Step = { family: string; run: Production };

const noneCache = memoPer<Prepared, Production>();

/** No change in production: what a run without the diet shift and any supply step starts from. */
const noProduction = (prepared: Prepared): Production =>
  noneCache(prepared, 'none', () => {
    const none = recordOf(
      prepared.countries,
      prepared.countries.map(() => zeros(prepared.items.length)),
    );
    return { food: none, change: none, clipped: [] };
  });

interface Chain {
  family: string;
  chain: SupplyChain;
}

/** What a module changes in the supply chain in this run: its use and its chain, or nulls. */
const supplyHooksOf = (m: LeverModule, ctx: RunContext) => ({
  used: m.hooks.demand?.(ctx) ?? null,
  chain: m.hooks.supplyChain?.(ctx) ?? null,
});

/** The modules that change the supply chain in this run, in registry order. */
const chainsOf = (ctx: RunContext): Chain[] =>
  MODULES.flatMap((m) => {
    const { used, chain } = supplyHooksOf(m, ctx);
    return used || chain
      ? [{ family: familyOf(m), chain: { ...chain, ...(used ? { used } : {}) } }]
      : [];
  });

const aloneCache = memoLatest<Prepared, Production>();

/**
 * The production steps of the families in `has`: the diet shift's change (none when it is left
 * out), then, for each module that changes the supply chain, the change with it and every
 * module before it. Without the diet, the supply steps act on today's diet, kept while only the
 * diet moves.
 */
const productionSteps = (
  ctx: RunContext,
  chains: readonly Chain[],
  has: (family: string) => boolean,
): Step[] => {
  const { prepared, scenario, options } = ctx;
  const withDiet = has('diet');
  const diet = withDiet ? dietChanges(prepared, scenario, options) : noProduction(prepared);
  const own = chains.filter((c) => has(c.family));
  const run = (k: number) => () =>
    productionChanges(
      prepared,
      scenario,
      options,
      combine(own.slice(0, k + 1).map((c) => c.chain)),
      diet.food,
    );
  return own.reduce<Step[]>(
    (steps, { family }, k) => [
      ...steps,
      {
        family,
        run: withDiet
          ? run(k)()
          : aloneCache(
              prepared,
              JSON.stringify([own.slice(0, k + 1).map((c) => c.family), scenario.levers, options]),
              run(k),
            ),
      },
    ],
    withDiet || own.length === 0 ? [{ family: 'diet', run: diet }] : [],
  );
};

/**
 * How each country's oilcake land follows the animals: with fixed trade shares, the world's
 * relative change in each group's production and the world's feed shares, as the cake is traded
 * like its oil; with each country supplying itself, its own change and its region's shares.
 */
const cakeDemandOf = (
  prepared: Prepared,
  options: Options,
  change: ByCountry,
): ((pc: PreparedCountry) => CakeDemand) => {
  const { feed } = prepared.data;
  const total = addVectors(zeros(prepared.items.length), ...Object.values(change));
  const world: CakeDemand = {
    relative: groupProductionChange(prepared.worldEmitting, total, prepared),
    sharesOf: (code) => feedSharesOf(feed, options.feed, 'World', code),
  };
  return (pc) =>
    options.location === 'domestic'
      ? {
          relative: groupProductionChange(
            pc.emitting,
            change[pc.country.iso3] as ItemVector,
            prepared,
          ),
          sharesOf: (code) => feedSharesOf(feed, options.feed, pc.country.region, code),
        }
      : world;
};

type ByCause<T> = Record<CountedCause, T>;

const causeRecord = <T>(f: (cause: CountedCause) => T): ByCause<T> =>
  Object.fromEntries(COUNTED_CAUSES.map((c) => [c, f(c)])) as ByCause<T>;

/** A country's full changes, kg a year, by the family that causes them. */
interface CountryParts {
  result: CountryResult;
  /** Farm emissions of each production step, the same in every band. */
  farm: Readonly<Record<string, GasVector>>;
  /**
   * Farm emissions a module's cut in intensity removes, by band: on the base year's production
   * (`own`) and on its change (`joint`).
   */
  cuts: Readonly<Record<string, Partial<Record<Band, Joint<GasVector>>>>>;
  /** CO₂ a year as a constant stream, such as clearing, by the cause it counts in and family. */
  co2: ByCause<Readonly<Record<string, number>>>;
  jointCo2: ByCause<Readonly<Record<string, number>>>;
  /** CO₂ a year that builds up after a change, by the cause it counts in, time constant and family. */
  builtUp: readonly BuiltUp[];
  /** The part of each production step's farm CO₂ that is grid electricity, kg a year. */
  gridFarm: Readonly<Record<string, number>>;
}

interface BuiltUp {
  cause: CountedCause;
  years: number;
  co2: Readonly<Record<string, number>>;
}

/**
 * A lever's effect on the base year and on the production change: the change ramps in as the
 * lever does, so the second ramps in by the square of the share.
 */
interface Joint<T> {
  own: T;
  joint: T;
}

interface IntensityCut {
  family: string;
  cut: (pc: PreparedCountry, band: Band) => Record<Gas, ItemVector>;
}

interface CountryHook {
  cause: LeverCause;
  hook: (c: CountryContext) => CountryPart;
}

const addRecords = (
  parts: readonly CountryPart[],
  key: 'co2' | 'jointCo2',
): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const p of parts) {
    for (const [k, v] of Object.entries(p[key] ?? {})) {
      out[k] = k in out ? (out[k] as number) + v : v;
    }
  }
  return out;
};

/** What a cut removes from the base year's production, kept while the cut is. */
/** A country's farmed mammals and their change, none without `mammals.json`. */
const countryMammals = (pc: PreparedCountry, change: ItemVector, prepared: Prepared) => {
  const herds = prepared.data.mammals?.byCountry[pc.country.iso3];
  return herds
    ? mammalsOf(herds, atLeastAll(groupProductionChange(pc.emitting, change, prepared)))
    : NO_MAMMALS;
};

const ownCutCache = memoPer<Record<Gas, ItemVector>, GasVector>();

const countryParts = (
  pc: PreparedCountry,
  /** The diet's change in food, or null where the diet is not read (a pass of the breakdown). */
  food: ItemVector | null,
  stages: readonly Stage[],
  prepared: Prepared,
  options: Options,
  intensityCuts: readonly IntensityCut[],
  countryHooks: readonly CountryHook[],
  /** How the oilcakes follow the animals at each stage. */
  cakes: readonly CakeDemand[],
  bands: readonly Band[],
  /** Each item's share of its CO₂ from grid electricity, or none. */
  gridShare: ItemVector | null,
): CountryParts => {
  const base = countryBase(pc, prepared, options.scope);
  const intensities = countryIntensities(pc, prepared, options.scope);
  const oilcakes = countryCakes(pc, prepared, options.scope);
  const change = (stages[stages.length - 1] as Stage).change;
  const cakeChanges = cakes.map((c) => cakeEmissionsChange(oilcakes, c));
  const cakeChange = cakeChanges[cakeChanges.length - 1] as GasVector[];
  const productionChange = groupTotals(change, prepared);
  const emitted = stages.map((s, k) =>
    (cakeChanges[k] ?? []).reduce((a, v) => addGas(a, v), emissionsOf(s.change, intensities)),
  );
  const total = emitted[emitted.length - 1] as GasVector;
  const farm = Object.fromEntries(
    stages.map((s, k) => {
      const own = emitted[k] as GasVector;
      const before = emitted[k - 1];
      return [s.family, before ? gasVector((g) => own[g] - before[g]) : own];
    }),
  );
  const cuts = Object.fromEntries(
    intensityCuts.map(({ family, cut }) => [
      family,
      Object.fromEntries(
        bands.map((band) => {
          const share = cut(pc, band);
          return [
            band,
            {
              own: ownCutCache(share, `${pc.country.iso3}|${options.scope}`, () =>
                addGas(
                  cutEmissions(pc.emitting, intensities, share),
                  cutCakeEmissions(oilcakes, oilcakes.kg, share),
                ),
              ),
              joint: addGas(
                cutEmissions(change, intensities, share),
                cutCakeEmissions(oilcakes, cakeChange, share),
              ),
            },
          ];
        }),
      ),
    ]),
  );
  const land = countryLand(pc, prepared).base;
  const landChange = landChangeOf(
    pc,
    change,
    productionChange,
    prepared,
    cakes[cakes.length - 1] as CakeDemand,
  );
  const extra = countryHooks.map(({ hook }) => hook({ pc, stages, land, landChange }));
  return {
    result: Object.assign(
      {
        iso3: pc.country.iso3,
        ...base,
        productionChange,
        emissionsChange: Object.values(cuts).reduce(
          (a, c) => (c.median ? addGas(addGas(a, c.median.own), c.median.joint) : a),
          total,
        ),
        proteinAfter: food
          ? base.proteinBefore + perCapitaPerDay(food, pc, prepared, 'protein')
          : base.proteinBefore,
        kcalAfter: food
          ? base.kcalBefore + perCapitaPerDay(food, pc, prepared, 'kcal')
          : base.kcalBefore,
        land,
        landChange,
        landArea: prepared.data.land.landArea?.[pc.country.iso3] ?? 0,
        ...countryMammals(pc, change, prepared),
        ...speciesOf(prepared.data.species?.byCountry[pc.country.iso3], land, landChange),
      },
      ...extra.map((e) => e.result ?? {}),
    ) as CountryResult,
    farm,
    cuts,
    co2: causeRecord((cause) =>
      addRecords(
        extra.filter((_, k) => countryHooks[k]?.cause === cause),
        'co2',
      ),
    ),
    jointCo2: causeRecord((cause) =>
      addRecords(
        extra.filter((_, k) => countryHooks[k]?.cause === cause),
        'jointCo2',
      ),
    ),
    builtUp: extra.flatMap((e, k) =>
      e.buildUp ? [{ cause: countryHooks[k]?.cause ?? DIET_CAUSE, ...e.buildUp }] : [],
    ),
    gridFarm: stepGridCo2(stages, intensities.kgPerTonne.co2, gridShare),
  };
};

/** The grid electricity's part of a vector of production's CO₂, kg. */
const gridCo2 = (change: ItemVector, co2: ItemVector, share: ItemVector): number =>
  change.reduce((a, t, i) => a + t * (co2[i] as number) * (share[i] as number), 0);

/** Each step's own change in the grid electricity's CO₂, as `farm` gives each step's emissions. */
const stepGridCo2 = (
  stages: readonly Stage[],
  co2: ItemVector,
  share: ItemVector | null,
): Record<string, number> => {
  const totals = stages.map((s) => (share ? gridCo2(s.change, co2, share) : 0));
  return share
    ? Object.fromEntries(
        stages.map((s, k) => [s.family, (totals[k] as number) - (totals[k - 1] ?? 0)]),
      )
    : {};
};

/** The first module's farm grid, which every pass reads whatever families are in play. */
const farmGridOf = (ctx: RunContext): FarmGrid | null =>
  MODULES.reduce<FarmGrid | null>((found, m) => found ?? m.hooks.grid?.(ctx) ?? null, null);

/**
 * The farm emissions of a family summed over the countries, in their order; accumulated in place
 * as this runs for every family and band of each pass.
 */
const farmTotal = (
  parts: readonly CountryParts[],
  family: string,
  band: Band,
): Joint<GasVector> => {
  const own = { co2: 0, ch4: 0, n2o: 0 };
  const joint = { co2: 0, ch4: 0, n2o: 0 };
  for (const p of parts) {
    const cut = p.cuts[family]?.[band];
    const o = cut ? cut.own : (p.farm[family] ?? ZERO_GAS);
    const j = cut ? cut.joint : ZERO_GAS;
    own.co2 += o.co2;
    own.ch4 += o.ch4;
    own.n2o += o.n2o;
    joint.co2 += j.co2;
    joint.ch4 += j.ch4;
    joint.n2o += j.n2o;
  }
  return { own, joint };
};

/**
 * The CO₂ streams of a cause summed over the countries, in their order, by family; accumulated in
 * place, once per pass as they do not depend on the band.
 */
const clearingOf = (
  parts: readonly CountryParts[],
  cause: CountedCause,
): Record<string, Joint<number>> => {
  const out: Record<string, { own: number; joint: number }> = {};
  for (const p of parts) {
    for (const [f, v] of Object.entries(p.co2[cause])) {
      (out[f] ??= { own: 0, joint: 0 }).own += v;
    }
    for (const [f, v] of Object.entries(p.jointCo2[cause])) {
      (out[f] ??= { own: 0, joint: 0 }).joint += v;
    }
  }
  return out;
};

/** The CO₂ that builds up of a cause summed over the countries, by time constant and family. */
const builtUpSums = (
  parts: readonly CountryParts[],
  cause: CountedCause,
): { family: string; lag: number; co2: number }[] => {
  const sums = new Map<string, { family: string; lag: number; co2: number }>();
  parts.forEach((p) =>
    p.builtUp
      .filter((b) => b.cause === cause)
      .forEach((b) =>
        Object.entries(b.co2).forEach(([family, v]) => {
          const key = `${b.years}|${family}`;
          const s = sums.get(key) ?? { family, lag: b.years, co2: 0 };
          sums.set(key, { ...s, co2: s.co2 + v });
        }),
      ),
  );
  return [...sums.values()].filter((s) => s.co2 !== 0);
};

/** Two paths added, or the one there is. */
const plusPath = (
  a: GasVector[] | undefined,
  b: GasVector[] | undefined,
): GasVector[] | undefined => (a && b ? sumPaths([a, b]) : (a ?? b));

/**
 * The CO₂ that builds up of a cause as yearly paths by family: each ramps in like the shift,
 * behind a lag of its time constant.
 */
const builtUpPaths = (
  parts: readonly CountryParts[],
  cause: CountedCause,
  years: readonly number[],
  scale: Scale,
  shareAt: (year: number) => number,
): Record<string, GasVector[]> =>
  builtUpSums(parts, cause).reduce<Record<string, GasVector[]>>((out, s) => {
    const share = builtUp(shareAt, years, s.lag);
    const path = familyPath(NO_FARM, { own: s.co2, joint: 0 }, years, scale, share);
    return { ...out, [s.family]: plusPath(out[s.family], path) as GasVector[] };
  }, {});

const isZero = (v: GasVector): boolean => GASES.every((g) => v[g] === 0);

const gridTotal = (parts: readonly CountryParts[], family: string): number =>
  parts.reduce((a, p) => a + (p.gridFarm[family] ?? 0), 0);

/**
 * The change to a family's farm CO₂ as the grid its electricity comes from moves from today's:
 * the electricity's CO₂ times the grid's ratio to today's less one, scaled like farm emissions
 * and ramped in like the shift. None without electricity.
 */
const gridPath = (
  kg: number,
  ratio: (year: number) => number,
  years: readonly number[],
  scale: Scale,
  shareAt: (year: number) => number,
): GasVector[] | undefined =>
  kg === 0
    ? undefined
    : years.map((y) => ({
        co2: kg * (ratio(y) - 1) * scale('co2', y) * shareAt(y),
        ch4: 0,
        n2o: 0,
      }));

/**
 * Yearly emission changes of one family: farm emissions scale like the baseline, clearing is a
 * constant stream; both ramp in like the shift, and the joint part by the square of the share.
 */
const familyPath = (
  farm: Joint<GasVector>,
  clearing: Joint<number>,
  years: readonly number[],
  scale: Scale,
  shareAt: (year: number) => number,
): GasVector[] =>
  years.map((y) => {
    const r = shareAt(y);
    const rr = r * r;
    const at = (g: Gas, own: number, joint: number) => {
      const k = scale(g, y);
      return r * (farm.own[g] * k + own) + rr * (farm.joint[g] * k + joint);
    };
    return {
      co2: at('co2', clearing.own, clearing.joint),
      ch4: at('ch4', 0, 0),
      n2o: at('n2o', 0, 0),
    };
  });

const NO_CLEARING: Joint<number> = { own: 0, joint: 0 };
const NO_FARM: Joint<GasVector> = { own: ZERO_GAS, joint: ZERO_GAS };

const sumPaths = (paths: readonly GasVector[][]): GasVector[] =>
  (paths[0] ?? []).map((_, i) => paths.reduce((a, p) => addGas(a, p[i] as GasVector), ZERO_GAS));

const sumBy = <T>(xs: readonly T[], f: (x: T) => GasVector): GasVector =>
  xs.reduce((a, x) => addGas(a, f(x)), ZERO_GAS);

const co2eOf = (v: GasVector) => sum(GASES.map((g: Gas) => v[g] * GWP100[g]));

const seriesOn = (series: { years: number[] }, values: number[], years: readonly number[]) =>
  years.map((y) => valueAt(series.years, values, y));

const observedOn = (series: Series, years: readonly number[]): (number | null)[] => {
  const byYear = new Map(series.years.map((y, i) => [y, series.values[i]]));
  return years.map((y) => byYear.get(y) ?? null);
};

/** The sum of several series, the first itself when alone, zeros when none. */
const sumSeries = (series: readonly number[][], years: readonly number[]): number[] =>
  series.length === 0
    ? zerosOn(years)
    : series.slice(1).reduce((a, s) => addSeries(a, s), series[0] as number[]);

/**
 * Parts of the avoided warming with the feedback (permafrost) shared out by each part's size,
 * equally when all are nil, so they add up to the total with it. Not by their signed values:
 * parts of opposite sign whose total nears zero would each take many times the feedback.
 */
export const shareOut = (parts: readonly number[], feedback: number): number[] => {
  const size = sum(parts.map(Math.abs));
  return parts.map((v) =>
    size > 0 ? v + (feedback * Math.abs(v)) / size : v + feedback / parts.length,
  );
};

/** shareOut at each year (or horizon): `parts[k][h]`, `feedback[h]`. */
export const shareFeedback = (
  parts: readonly number[][],
  feedback: readonly number[],
): number[][] => {
  const byYear = feedback.map((f, h) =>
    shareOut(
      parts.map((p) => p[h] ?? 0),
      f,
    ),
  );
  return parts.map((p, k) => p.map((v, h) => byYear[h]?.[k] ?? v));
};

/**
 * A cause's avoided warming by gas once it has its share of the feedback: the cause's share
 * (`shared`, its `total` and feedback) split again between its gases and the rest of the cause
 * (forcing that is no gas) by their sizes, as `shareOut` splits it between causes.
 */
export const gasShares = (
  byGas: Readonly<Record<Gas, readonly number[]>>,
  total: readonly number[],
  shared: readonly number[],
): Record<Gas, number[]> => {
  const gasTotal = sumOfGases(byGas);
  const parts = [...GASES.map((g) => [...byGas[g]]), total.map((v, i) => v - (gasTotal[i] ?? 0))];
  const split = shareFeedback(
    parts,
    shared.map((v, i) => v - (total[i] ?? 0)),
  );
  return Object.fromEntries(GASES.map((g, k) => [g, split[k] ?? []])) as Record<Gas, number[]>;
};

interface BaselineBand {
  /** The baseline temperature. */
  temperature: number[];
  /** The population baseline's farm emissions over the SSP's, warming by gas. */
  farm: Record<Gas, number[]>;
  /** The warming the modules add, split by cause where they say. */
  byCause: readonly CauseWarming[];
  /** What each module's baseline hook kept for its feedback. */
  memo: Readonly<Record<string, unknown>>;
}

/** The baseline does not depend on the scenario: once per options. */
const baselineCache = memoPer<Prepared, Record<Band, BaselineBand>>();

/** The options of the modules that change the baseline, which its cache is keyed by. */
const BASELINE_OPTIONS = MODULES.filter((m) => m.hooks.baseline || m.hooks.population).flatMap(
  (m) => m.options.map((o) => o.field),
);

/** World population by year: the first module's projection, or the countries' own. */
const worldPopulationOf = (
  prepared: Prepared,
  options: Options,
  currentYear: number,
): Readonly<Record<number, number>> =>
  MODULES.reduce<Readonly<Record<number, number>> | null>(
    (found, m) => found ?? m.hooks.population?.({ prepared, options, currentYear }) ?? null,
    null,
  ) ?? prepared.worldPopulation;

/** The first module's multiplier on every human emission outside farming, or none. */
const peopleOf = (
  prepared: Prepared,
  options: Options,
  currentYear: number,
): ((year: number) => number) | null =>
  MODULES.reduce<((year: number) => number) | null>(
    (found, m) => found ?? m.hooks.people?.({ prepared, options, currentYear }) ?? null,
    null,
  );

/** With people on Earth set, farm emissions follow the people whatever the baseline option. */
const baselineOf = (options: Options): Baseline =>
  options.people === undefined ? options.baseline : 'population';

/**
 * The baseline temperature by band: the SSP's, plus the population baseline's farm emissions,
 * plus what each module adds in registry order (the data centres beyond the SSP, then the
 * permafrost release the warming so far causes).
 */
const baselineTemperature = (
  prepared: Prepared,
  options: Options,
  currentYear: number,
): Record<Band, BaselineBand> =>
  baselineCache(
    prepared,
    [
      options.baseline,
      options.ssp,
      options.climate,
      ...BASELINE_OPTIONS.map((f) => (options as unknown as Record<string, string>)[f]),
      options.people ?? '',
      options.peopleYear ?? '',
      currentYear,
    ].join('|'),
    () => {
      const { climate } = prepared.data;
      const tYears = range(FIRST_YEAR, END_YEAR);
      const total = climate.scenarioTemperature[options.ssp];
      const scale = baselineScale(
        baselineOf(options),
        climate,
        worldPopulationOf(prepared, options, currentYear),
        prepared.baseYear,
      );
      const adjustmentEmissions =
        baselineOf(options) === 'population'
          ? populationAdjustmentEmissions(climate, options.ssp, prepared.baseYear, (y) =>
              scale('co2', y),
            )
          : [];
      return bandRecord((band) => {
        const farm =
          adjustmentEmissions.length > 0
            ? warmingByGas(
                adjustmentEmissions,
                prepared.baseYear,
                climate,
                options.climate,
                band,
                tYears,
              )
            : gasRecord(() => zerosOn(tYears));
        const adjustment = sumOfGases(farm);
        return MODULES.reduce<BaselineBand>(
          (acc, m) => {
            const part = m.hooks.baseline?.({
              prepared,
              options,
              currentYear,
              band,
              tYears,
              temperature: acc.temperature,
            });
            return part
              ? {
                  temperature: part.warming
                    ? addSeries(acc.temperature, part.warming)
                    : acc.temperature,
                  farm,
                  byCause: part.byCause ? [...acc.byCause, part.byCause] : acc.byCause,
                  memo: { ...acc.memo, [m.id]: part.memo },
                }
              : acc;
          },
          {
            temperature: addSeries(seriesOn(total, total[band], tYears), adjustment),
            farm,
            byCause: [],
            memo: {},
          },
        );
      });
    },
  );

const gasRecord = <T>(f: (g: Gas) => T): Record<Gas, T> =>
  Object.fromEntries(GASES.map((g) => [g, f(g)])) as Record<Gas, T>;

const subtract = (a: readonly number[], b: readonly number[]): number[] =>
  a.map((v, i) => v - (b[i] ?? 0));

/** Series added up by key, each key's sum. */
const addByKey = <K extends string>(
  records: readonly Partial<Record<K, number[]>>[],
  tYears: readonly number[],
): Partial<Record<K, number[]>> =>
  records.reduce<Partial<Record<K, number[]>>>(
    (acc, r) => ({
      ...acc,
      ...Object.fromEntries(
        (Object.entries(r) as [K, number[]][]).map(([k, v]) => [
          k,
          addSeries(acc[k] ?? zerosOn(tYears), v),
        ]),
      ),
    }),
    {},
  );

/** The modules' warming by cause, added up. */
const modulesByCause = (band: BaselineBand, tYears: readonly number[]): CauseWarming => ({
  byCause: addByKey(
    band.byCause.map((w) => w.byCause),
    tYears,
  ),
  byGas: Object.fromEntries(
    GASES.map((g) => [
      g,
      addByKey(
        band.byCause.map((w) => w.byGas[g] ?? {}),
        tYears,
      ),
    ]),
  ),
});

/** The SSP's attribution added up over its causes, median, on `tYears`. */
const attributionTotal = (climate: Climate, ssp: Ssp, tYears: readonly number[]): number[] =>
  Object.values(climate.attribution[ssp]).reduce<number[]>(
    (acc, b) =>
      addSeries(
        acc,
        tYears.map((y) => valueAt(b.years, b.median, y)),
      ),
    zerosOn(tYears),
  );

/**
 * What the baseline adds to the SSP's attribution in median warming, by cause and each gas's by
 * cause: farming through the population baseline, the rest as the modules split it, and in
 * `other` whatever still parts the attribution from the baseline line, so that the causes add
 * up to it.
 */
const baselineByCause = (
  prepared: Prepared,
  options: Options,
  currentYear: number,
): CauseWarming => {
  const tYears = range(FIRST_YEAR, END_YEAR);
  const band = baselineTemperature(prepared, options, currentYear).median;
  const modules = modulesByCause(band, tYears);
  const byCause = { ...modules.byCause, agriculture: sumOfGases(band.farm) };
  const counted = Object.values(byCause).reduce(
    (acc, v) => addSeries(acc, v),
    attributionTotal(prepared.data.climate, options.ssp, tYears),
  );
  const rest = subtract(band.temperature, counted);
  return {
    byCause: { ...byCause, other: addSeries(byCause.other ?? zerosOn(tYears), rest) },
    byGas: gasRecord((g) => ({
      ...(modules.byGas[g] ?? {}),
      agriculture: [...band.farm[g]],
    })),
  };
};

/** Warming avoided each year from the warming change of each band, its range ordered low to high. */
export const avoidedBand = (delta: {
  median: number[];
  p05: number[];
  p95: number[];
}): { median: number[]; p05: number[]; p95: number[] } => {
  const avoided = (v: number | undefined) => 0 - (v ?? 0);
  return {
    median: delta.median.map(avoided),
    p05: delta.p05.map((v, i) => Math.min(avoided(v), avoided(delta.p95[i]))),
    p95: delta.p05.map((v, i) => Math.max(avoided(v), avoided(delta.p95[i]))),
  };
};

const HORIZON_YEARS = [2050, 2100];

/** What a module needs to act: a lever adopted or an option away from its default. */
const acts = (m: LeverModule, ctx: RunContext): boolean =>
  m.levers.some((l) => ctx.adoption(l.id) > 0) ||
  m.options.some(
    (o) => (ctx.options as unknown as Record<string, string>)[o.field] !== o.values[0],
  );

const dietActs = (s: Scenario): boolean =>
  s.shift > 0 || Object.values(s.groupShifts).some((v) => (v ?? 0) > 0);

const causeOfModule = (m: LeverModule): LeverCause => m.cause ?? DIET_CAUSE;

/** A family's warming from forcing that is no emission, in the cause it mainly acts on. */
const ownWarming = (
  module: LeverModule,
  part: WorldPart,
  cause: CountedCause,
  band: Band,
): number[][] =>
  module.family && part.extraWarming && causeOfModule(module) === cause
    ? [part.extraWarming[band]]
    : [];

/** A family's warming counted in another cause (the energy levers' air pollution). */
const otherWarming = (
  module: LeverModule,
  part: WorldPart,
  cause: CountedCause,
  band: Band,
): number[][] => {
  const own = part.warmingByCause?.[cause];
  return module.family && own ? [own[band]] : [];
};

/**
 * The warming a module's world part adds in a cause, on the temperature years: its own forcing
 * in its own cause, and what it counts in another (the energy levers' air pollution).
 */
const warmingIn = (
  module: LeverModule,
  part: WorldPart,
  cause: CountedCause,
  band: Band,
): number[][] => [
  ...ownWarming(module, part, cause, band),
  ...otherWarming(module, part, cause, band),
];

const zeroPaths = memoPer<readonly number[], GasVector[]>();
const zeroPath = (years: readonly number[]): GasVector[] =>
  zeroPaths(years, 'zero', () => years.map(() => ZERO_GAS));

interface PassFrame {
  ctx: RunContext;
  years: readonly number[];
  tYears: readonly number[];
  /** The scale of the scenario's farm emissions: the baseline's, times a module's scenarioScale. */
  scale: Scale;
  baseScale: Scale;
  shareAt: (year: number) => number;
  completeIndex: number;
  /** The multiplier on what the families outside farming change, by year, or none. */
  people: ((year: number) => number) | null;
}

/** The modules that scale the scenario's farm emissions: players every farm family meets. */
const SCALING = MODULES.filter((m) => m.family && m.hooks.scenarioScale);

/** The first module's multiplier on the scenario's farm emissions, or none. */
const scenarioFactorOf = (ctx: RunContext): ((year: number) => number) | null =>
  MODULES.reduce<((year: number) => number) | null>(
    (found, m) => found ?? m.hooks.scenarioScale?.(ctx) ?? null,
    null,
  );

const OUTSIDE_LEVERS = MODULES.filter((m) => m.farm === false).flatMap((m) =>
  m.levers.map((l) => l.id),
);

const outsideCaches = memoPer<Prepared, ReturnType<typeof memoLatest<LeverModule, WorldPart>>>();

const scaledBands = (
  byBand: Record<Band, number[]>,
  years: readonly number[],
  people: (year: number) => number,
): Record<Band, number[]> =>
  bandRecord((b) => byBand[b].map((v, i) => v * people(years[i] as number)));

/**
 * A world part outside farming with fewer or more people: its emissions scaled by the people
 * each year, its warming from forcing by the people that year (that forcing is short-lived).
 */
const withPeople = (
  part: WorldPart,
  people: ((year: number) => number) | null,
  w: WorldContext,
): WorldPart => {
  const extra = part.extraEmissions;
  const byCause = part.warmingByCause;
  return people
    ? {
        ...part,
        ...(extra && {
          extraEmissions: bandRecord((b) =>
            extra[b].map((v, i) => gasVector((g) => v[g] * people(w.years[i] as number))),
          ),
        }),
        ...(part.extraWarming && {
          extraWarming: scaledBands(part.extraWarming, w.tYears, people),
        }),
        ...(byCause && {
          warmingByCause: Object.fromEntries(
            Object.entries(byCause).map(([c, v]) => [c, scaledBands(v, w.tYears, people)]),
          ),
        }),
      }
    : part;
};

/**
 * The world part of a module outside farming with the families in `inPlay` acting, kept per set
 * of them and keyed by what it reads, so a move of farming redoes none.
 */
const outsideWorld = (
  ctx: RunContext,
  module: LeverModule,
  inPlay: string,
  w: WorldContext,
  people: ((year: number) => number) | null,
): WorldPart =>
  outsideCaches(ctx.prepared, inPlay, () => memoLatest<LeverModule, WorldPart>())(
    module,
    JSON.stringify([
      OUTSIDE_LEVERS.map((id) => ctx.adoption(id)),
      ctx.options,
      ctx.scenario.rampEnd,
      ctx.currentYear,
    ]),
    () => withPeople(module.hooks.world?.(ctx, w) ?? {}, people, w),
  );

/** One pass of the emission changes: what every family changes, by band and cause. */
interface Pass {
  parts: CountryParts[];
  countries: CountryResult[];
  world: { module: LeverModule; part: WorldPart }[];
  /** Yearly emission changes by band, family and cause. */
  paths: Partial<Record<Band, Record<string, ByCause<GasVector[]>>>>;
}

/**
 * The emission changes of the production `steps` and of `modules`' hooks, in `bands`: each
 * country's parts, then the modules' world parts, then each family's yearly changes by cause.
 */
const emissionsPass = (
  frame: PassFrame,
  steps: readonly Step[],
  modules: readonly LeverModule[],
  bands: readonly Band[],
): Pass => {
  const { ctx, years, tYears, scale, shareAt, completeIndex } = frame;
  const { prepared, options } = ctx;
  const intensityCuts = modules.flatMap((m) => {
    const cut = m.hooks.intensity?.(ctx);
    return cut ? [{ family: familyOf(m), cut }] : [];
  });
  const countryHooks = modules.flatMap((m) => {
    const hook = m.hooks.country?.(ctx);
    return hook ? [{ cause: causeOfModule(m), hook }] : [];
  });
  const cakeOfs = steps.map((s) => cakeDemandOf(prepared, options, s.run.change));
  const grid = farmGridOf(ctx);
  // A pass of the breakdown reads the median alone and none of the countries' diets.
  const food = bands.length > 1 ? (steps[0] as Step).run.food : null;
  const parts = prepared.countries.map((pc) =>
    countryParts(
      pc,
      food ? (food[pc.country.iso3] as ItemVector) : null,
      steps.map((s) => ({ family: s.family, change: s.run.change[pc.country.iso3] as ItemVector })),
      prepared,
      options,
      intensityCuts,
      countryHooks,
      cakeOfs.map((cakeOf) => cakeOf(pc)),
      bands,
      grid ? grid.share(pc) : null,
    ),
  );
  const countries = parts.map((p) => p.result);
  const w: WorldContext = {
    countries,
    years,
    tYears,
    shareAt,
    completeIndex,
    baselineScale: frame.baseScale,
  };
  const world = modules.map((module) => ({
    module,
    part:
      module.farm === false
        ? outsideWorld(ctx, module, '*', w, frame.people)
        : (module.hooks.world?.(ctx, w) ?? {}),
  }));
  const ownOf = (family: string) => world.find((w) => w.module.family === family);
  const clearingPaths = causeRecord((c) => {
    const lagged = builtUpPaths(parts, c, years, scale, shareAt);
    const constant = Object.fromEntries(
      Object.entries(clearingOf(parts, c))
        .filter(([, v]) => v.own !== 0 || v.joint !== 0)
        .map(([f, v]) => [f, familyPath(NO_FARM, v, years, scale, shareAt)]),
    );
    return Object.fromEntries(
      [...new Set([...Object.keys(constant), ...Object.keys(lagged)])].map((f) => [
        f,
        plusPath(constant[f], lagged[f]) as GasVector[],
      ]),
    );
  });
  /** A family's farm emissions in a band, or none, their grid electricity following the grid. */
  const farmPath = (f: string, band: Band): GasVector[] => {
    const farm = farmTotal(parts, f, band);
    const onGrid = grid
      ? gridPath(gridTotal(parts, f), grid.ratio, years, scale, shareAt)
      : undefined;
    return isZero(farm.own) && isZero(farm.joint)
      ? zeroPath(years)
      : (plusPath(familyPath(farm, NO_CLEARING, years, scale, shareAt), onGrid) as GasVector[]);
  };
  /**
   * A farm family's paths: its farm emissions and the streams counted in farming (the carbon of
   * uncaught fish) in farming, its clearing in the other causes.
   */
  const farmPaths = (f: string, band: Band): ByCause<GasVector[]> =>
    causeRecord((c) =>
      c === 'agriculture'
        ? (plusPath(farmPath(f, band), clearingPaths.agriculture[f]) as GasVector[])
        : (clearingPaths[c][f] ?? zeroPath(years)),
    );
  /**
   * A family's own emissions, all in the cause it mainly acts on; a farm family's are added to its
   * farm paths (the grid's CO₂ that clean farm energy adds back as the grid changes).
   */
  const ownPaths = (module: LeverModule, extra: GasVector[], f: string, band: Band) =>
    causeRecord((c) => {
      const farm = module.farm === false ? zeroPath(years) : farmPaths(f, band)[c];
      return c === causeOfModule(module) ? (plusPath(farm, extra) as GasVector[]) : farm;
    });
  const pathsIn = (band: Band): Record<string, ByCause<GasVector[]>> =>
    Object.fromEntries(
      FAMILIES.map((f) => {
        const own = ownOf(f);
        const extra = own?.part.extraEmissions?.[band];
        return [f, extra && own ? ownPaths(own.module, extra, f, band) : farmPaths(f, band)];
      }),
    );
  return {
    parts,
    countries,
    world,
    paths: Object.fromEntries(bands.map((b) => [b, pathsIn(b)])),
  };
};

/** The warming avoided at horizon `h`: the emissions' and the extra forcing's, with its sign. */
const avoidedAtHorizon = (warming: readonly number[], extras: number[][], h: 0 | 1): number => {
  const year = HORIZON_YEARS[h] as number;
  return 0 - ((warming[h] ?? 0) + sum(extras.map((e) => e[year - FIRST_YEAR] ?? 0)));
};

/**
 * Each family's avoided warming at the horizons and avoided CO₂e once the shift is complete, by
 * cause, as one vector: for each cause in `COUNTED_CAUSES`, [2050, 2100, CO₂e]. Read on the
 * median of a pass.
 */
const familyValues = (pass: Pass, frame: PassFrame, family: string): number[] => {
  const { ctx, completeIndex } = frame;
  const { currentYear } = ctx;
  const { climate } = ctx.prepared.data;
  const own = pass.world.find((w) => w.module.family === family);
  const paths = pass.paths.median?.[family];
  return COUNTED_CAUSES.flatMap((c) => {
    const path = paths?.[c] ?? [];
    const warming = warmingFrom(
      path,
      currentYear,
      climate,
      ctx.options.climate,
      'median',
      HORIZON_YEARS,
    );
    const extras = own ? warmingIn(own.module, own.part, c, 'median') : [];
    const atEnd = path[completeIndex];
    return [
      avoidedAtHorizon(warming, extras, 0),
      avoidedAtHorizon(warming, extras, 1),
      atEnd ? -co2eOf(atEnd) : 0,
    ];
  });
};

const passCaches = memoPer<
  Prepared,
  ReturnType<typeof memoLatest<Prepared, Map<string, number[]>>>
>();

/**
 * The family values of a breakdown pass, one kept per set of production families in play: a
 * pass without the diet is not redone while only the diet moves, and none is while a lever
 * outside farming moves.
 */
const passCache = (prepared: Prepared, inPlay: string) => {
  const memo = passCaches(prepared, inPlay, () => memoLatest<Prepared, Map<string, number[]>>());
  return (key: string, compute: () => Map<string, number[]>) => memo(prepared, key, compute);
};

/**
 * The by-family breakdown, by cause: each acting family's Shapley value (attribution.ts) over
 * the acting families. Farming's families interact only through production (the diet and less
 * waste): the others act on the production the steps leave and not on each other, so a
 * coalition's farm worth is read from one pass per set of production families in it, at most
 * four, rather than one run per coalition. The families outside farming interact with each
 * other but not with farming: their worth is their world hooks run with the others' levers off.
 */
const familyShares = (
  frame: PassFrame,
  full: Pass,
  chains: readonly Chain[],
): Map<string, number[]> => {
  const { ctx } = frame;
  const scaling = SCALING.filter((m) => m.hooks.scenarioScale?.(ctx)).map(familyOf);
  const production = [
    ...(dietActs(ctx.scenario) ? ['diet'] : []),
    ...chains.map((c) => c.family),
    ...scaling,
  ];
  const farmModules = MODULES.filter((m) => m.farm === true || (m.family && m.farm !== false));
  const dependent = farmModules
    .filter(
      (m) =>
        m.family && !m.hooks.scenarioScale && !production.includes(familyOf(m)) && acts(m, ctx),
    )
    .map(familyOf);
  const outside = MODULES.filter((m) => m.family && m.farm === false && acts(m, ctx)).map(familyOf);
  const players = [...production, ...dependent, ...outside];
  const fullKey = production.join('|');
  const size = COUNTED_CAUSES.length * 3;
  const valuesOf = (pass: Pass | null, families: readonly string[]) =>
    new Map(
      families.map((f) => [f, pass ? familyValues(pass, frame, f) : new Array(size).fill(0)]),
    );
  const fullValues = valuesOf(full, players);
  const leversOf = (families: readonly string[]) =>
    MODULES.filter((m) => families.includes(familyOf(m))).flatMap((m) =>
      m.levers.map((l) => ctx.adoption(l.id)),
    );
  const passValues = (inPlay: readonly string[]): Map<string, number[]> => {
    const key = inPlay.join('|');
    return key === fullKey ? fullValues : otherPass(inPlay, key);
  };
  /** The values of a pass with only the production families `inPlay`, kept per set of them. */
  const otherPass = (inPlay: readonly string[], key: string): Map<string, number[]> => {
    const { scenario, options, currentYear } = ctx;
    const { shift, groupShifts, basis, replacement, where } = scenario;
    const families = [...inPlay, ...dependent];
    return passCache(ctx.prepared, key)(
      JSON.stringify([
        inPlay.includes('diet') ? [shift, groupShifts, basis, replacement, where] : null,
        families,
        leversOf(families),
        options,
        scenario.rampEnd,
        currentYear,
      ]),
      () =>
        valuesOf(
          inPlay.length === 0 && dependent.length === 0
            ? null
            : emissionsPass(
                inPlay.some((f) => scaling.includes(f))
                  ? frame
                  : { ...frame, scale: frame.baseScale },
                productionSteps(ctx, chains, (f) => inPlay.includes(f)),
                farmModules,
                ['median'],
              ),
          families,
        ),
    );
  };
  const outsideModules = MODULES.filter((m) => m.farm === false && outside.includes(familyOf(m)));
  const outsideKey = outside.join('|');
  const outsideCache = new Map<string, Map<string, number[]>>([[outsideKey, fullValues]]);
  /**
   * The values of the families outside farming with only `inPlay` of them acting: their world
   * hooks again, each lever of another family read as not adopted, as they interact with each
   * other (the grid renewable electricity leaves) but not with farming.
   */
  const outsideValues = (inPlay: readonly string[]): Map<string, number[]> => {
    const key = inPlay.join('|');
    if (!outsideCache.has(key)) {
      const off = new Set(
        outsideModules
          .filter((m) => !inPlay.includes(familyOf(m)))
          .flatMap((m) => m.levers.map((l) => l.id)),
      );
      const masked: RunContext = {
        ...ctx,
        adoption: (id) => (off.has(id) ? 0 : ctx.adoption(id)),
      };
      const { years, tYears, shareAt, completeIndex } = frame;
      const world = outsideModules.map((module) => ({
        module,
        part: outsideWorld(
          masked,
          module,
          key,
          {
            countries: full.countries,
            years,
            tYears,
            shareAt,
            completeIndex,
            baselineScale: frame.baseScale,
          },
          frame.people,
        ),
      }));
      const paths = Object.fromEntries(
        world.map(({ module, part }) => [
          familyOf(module),
          causeRecord((c) =>
            c === causeOfModule(module) && part.extraEmissions
              ? part.extraEmissions.median
              : zeroPath(years),
          ),
        ]),
      );
      outsideCache.set(
        key,
        valuesOf({ parts: [], countries: full.countries, world, paths: { median: paths } }, inPlay),
      );
    }
    return outsideCache.get(key) as Map<string, number[]>;
  };
  const zero = new Array<number>(size).fill(0);
  return shapley(players, (coalition) => {
    const inPlay = production.filter((f) => coalition.includes(f));
    const farm = passValues(inPlay);
    const away = outsideValues(outside.filter((f) => coalition.includes(f)));
    return coalition.reduce<number[]>((acc, f) => {
      const v = (outside.includes(f) ? away : farm).get(f) ?? zero;
      return acc.map((a, k) => a + (v[k] as number));
    }, zero);
  });
};

/** Runs a scenario on prepared data: shift, levers, production, emissions, temperature. */
const withPeopleYear = (options: Options, scenario: Scenario): Options =>
  options.people === undefined ? options : { ...options, peopleYear: scenario.rampEnd };

export const runPrepared = (
  prepared: Prepared,
  scenario: Scenario,
  given: Options,
  currentYear: number,
): ScenarioResult => {
  const options = withPeopleYear(given, scenario);
  const { climate } = prepared.data;
  const levers = scenario.levers ?? {};
  const ctx: RunContext = {
    prepared,
    scenario,
    options,
    currentYear,
    adoption: (id) => adoptionOf(levers, id),
  };
  const chains = chainsOf(ctx);
  const steps = productionSteps(ctx, chains, () => true);
  const years = range(currentYear, END_YEAR);
  const tYears = range(FIRST_YEAR, END_YEAR);
  const scale = tabulate(
    baselineScale(
      baselineOf(options),
      climate,
      worldPopulationOf(prepared, options, currentYear),
      prepared.baseYear,
    ),
    years,
  );
  const shareAt = (y: number) => (y < currentYear ? 0 : ramp(y, currentYear, scenario.rampEnd));
  const completeIndex = Math.min(Math.max(scenario.rampEnd, currentYear), END_YEAR) - currentYear;
  const people = peopleOf(prepared, options, currentYear);
  const factor = scenarioFactorOf(ctx);
  const frame: PassFrame = {
    ctx,
    years,
    tYears,
    scale: factor ? tabulate((g, y) => scale(g, y) * factor(y), years) : scale,
    baseScale: scale,
    shareAt,
    completeIndex,
    people,
  };
  const full = emissionsPass(frame, steps, MODULES, BANDS);
  const { countries, world } = full;
  const worldBase = sumBy(countries, (c) => c.emissions);
  const byFamily = bandRecord((band): Record<string, GasVector[]> =>
    Object.fromEntries(
      FAMILIES.map((f) => {
        const byCause = full.paths[band]?.[f] as ByCause<GasVector[]>;
        return [f, sumPaths(COUNTED_CAUSES.map((c) => byCause[c]))];
      }),
    ),
  );
  const differenceIn = bandRecord((band) => sumPaths(FAMILIES.map((f) => byFamily[band][f] ?? [])));
  const baselinePath = years.map((y) => gasVector((g) => worldBase[g] * scale(g, y)));
  const farmDifference = sumPaths(FARM_FAMILIES.map((f) => byFamily.median[f] ?? []));

  const base = baselineTemperature(prepared, options, currentYear);
  const change = baselineByCause(prepared, options, currentYear);
  const extraWarming = bandRecord((band) =>
    sumSeries(
      world.flatMap((w) => [
        ...(w.part.extraWarming ? [w.part.extraWarming[band]] : []),
        ...Object.values(w.part.warmingByCause ?? {}).map((byBand) => byBand[band]),
      ]),
      tYears,
    ),
  );
  const leversDelta = bandRecord((band) =>
    addSeries(
      warmingFrom(differenceIn[band], currentYear, climate, options.climate, band, tYears),
      extraWarming[band],
    ),
  );
  const feedbackDelta = bandRecord((band) =>
    sumSeries(
      MODULES.flatMap((m) => {
        const own = m.hooks.feedback?.({
          prepared,
          options,
          currentYear,
          band,
          tYears,
          temperature: base[band].temperature,
          memo: base[band].memo[m.id],
          delta: leversDelta[band],
        });
        return own ? [own] : [];
      }),
      tYears,
    ),
  );
  const delta = bandRecord((band) => addSeries(leversDelta[band], feedbackDelta[band]));
  const baseline = bandRecord((band) => base[band].temperature);
  const scenarioBand = bandRecord((band) => addSeries(baseline[band], delta[band]));

  const avoidedAt = differenceIn.median[completeIndex];
  const avoided = avoidedAt ? gasVector((g) => 0 - avoidedAt[g]) : ZERO_GAS;
  const avoidedIn = (year: number) => {
    const values = BANDS.map((band) => 0 - (delta[band][year - FIRST_YEAR] ?? 0));
    const range95 = values.slice(1);
    return { median: values[0] ?? 0, p05: Math.min(...range95), p95: Math.max(...range95) };
  };

  const causeGas = causeRecord((c) =>
    warmingByGas(
      sumPaths(FAMILIES.map((f) => full.paths.median?.[f]?.[c] ?? [])),
      currentYear,
      climate,
      options.climate,
      'median',
      tYears,
    ),
  );
  const causeChange = causeRecord((c) =>
    addSeries(
      sumOfGases(causeGas[c]),
      sumSeries(
        world.flatMap((w) => warmingIn(w.module, w.part, c, 'median')),
        tYears,
      ),
    ),
  );
  const causeShares = shareFeedback(
    COUNTED_CAUSES.map((c) => causeChange[c]),
    feedbackDelta.median,
  );
  const avoidedByCause = causeRecord((c) =>
    (causeShares[COUNTED_CAUSES.indexOf(c)] ?? []).map((v) => 0 - v),
  );
  const leverGas = Object.fromEntries(
    LEVER_CAUSES.map((c) => [
      c,
      gasShares(causeGas[c], causeChange[c], causeShares[COUNTED_CAUSES.indexOf(c)] ?? []),
    ]),
  ) as Record<LeverCause, Record<Gas, number[]>>;
  const avoidedByGas = Object.fromEntries(
    GASES.map((g) => [
      g,
      Object.fromEntries(LEVER_CAUSES.map((c) => [c, leverGas[c][g].map((v) => 0 - v)])),
    ]),
  ) as Record<Gas, Record<LeverCause, number[]>>;

  const shares = familyShares(frame, full, chains);
  const feedbackAt = HORIZON_YEARS.map((y) => 0 - (feedbackDelta.median[y - FIRST_YEAR] ?? 0));
  const players = [...shares.keys()];
  const causes = COUNTED_CAUSES.length;
  const sharedAt = HORIZON_YEARS.map((_, h) =>
    shareOut(
      players.flatMap((f) => COUNTED_CAUSES.map((_, c) => shares.get(f)?.[c * 3 + h] ?? 0)),
      feedbackAt[h] as number,
    ),
  );
  const warmingOf = (family: string, c: number, h: number): number => {
    const k = players.indexOf(family);
    return k < 0 ? 0 : (sharedAt[h]?.[k * causes + c] ?? 0);
  };
  const co2eOfFamily = (family: string, c: number): number => shares.get(family)?.[c * 3 + 2] ?? 0;
  const listed = FAMILIES;
  const perFamily = (f: (family: string) => number): Record<string, number> =>
    Object.fromEntries(listed.map((family) => [family, f(family)]));
  const byCauseOf = (f: (family: string, c: number) => number) =>
    Object.fromEntries(
      listed.map((family) => [family, causeRecord((c) => f(family, COUNTED_CAUSES.indexOf(c)))]),
    ) as Record<string, ByCause<number>>;
  const familyCause = {
    avoidedCo2e: byCauseOf(co2eOfFamily),
    avoidedWarming2050: byCauseOf((family, c) => warmingOf(family, c, 0)),
    avoidedWarming2100: byCauseOf((family, c) => warmingOf(family, c, 1)),
  };
  const totalOf = (r: ByCause<number>) => sum(COUNTED_CAUSES.map((c) => r[c]));
  const causeTotal = (r: Record<string, ByCause<number>>) =>
    causeRecord((c) => sum(FAMILIES.map((f) => r[f]?.[c] ?? 0)));

  const result: ScenarioResult = {
    countries,
    years,
    baselineEmissions: baselinePath,
    scenarioEmissions: baselinePath.map((e, i) => addGas(e, farmDifference[i] as GasVector)),
    temperature: {
      years: tYears,
      observed: observedOn(climate.observed[options.temperature], tYears),
      baseline,
      scenario: scenarioBand,
      avoided: avoidedBand(delta),
      avoidedByCause,
      avoidedByGas,
      baselineChange: change,
    },
    summary: Object.assign(
      {
        avoided,
        avoidedCo2e: co2eOf(avoided),
        avoidedWarming2050: avoidedIn(2050),
        avoidedWarming2100: avoidedIn(2100),
        clipped: [...new Set(steps.flatMap((s) => s.run.clipped))].sort(),
        landBefore: countries.reduce((a, c) => addLand(a, c.land), NO_LAND),
        landFreed: countries.reduce(
          (a, c) => ({
            cropland: a.cropland - c.landChange.cropland,
            pasture: a.pasture - c.landChange.pasture,
          }),
          NO_LAND,
        ),
        byFamily: {
          avoidedCo2e: perFamily((f) => totalOf(familyCause.avoidedCo2e[f] as ByCause<number>)),
          avoidedWarming2050: perFamily((f) =>
            totalOf(familyCause.avoidedWarming2050[f] as ByCause<number>),
          ),
          avoidedWarming2100: perFamily((f) =>
            totalOf(familyCause.avoidedWarming2100[f] as ByCause<number>),
          ),
        },
        byFamilyCause: familyCause,
        byCause: {
          avoidedCo2e: causeTotal(familyCause.avoidedCo2e),
          avoidedWarming2050: causeTotal(familyCause.avoidedWarming2050),
          avoidedWarming2100: causeTotal(familyCause.avoidedWarming2100),
        },
      },
      ...world.map((w) => w.part.summary ?? {}),
    ) as Summary,
  };
  return Object.assign(result, ...world.map((w) => w.part.result ?? {})) as ScenarioResult;
};

/**
 * Runs a scenario end to end. The scenario-independent part is prepared once per data
 * object and cached, so repeated calls on slider moves only redo the shift.
 */
export const runScenario = (
  data: ModelData,
  scenario: Scenario,
  options: Options,
  currentYear: number,
): ScenarioResult => runPrepared(prepare(data), scenario, options, currentYear);
