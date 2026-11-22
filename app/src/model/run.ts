import {
  GASES,
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
  MODULES,
} from '../levers/registry';
import type {
  CountryContext,
  CountryPart,
  LeverModule,
  RunContext,
  Stage,
  SupplyChain,
  WorldPart,
} from '../levers/types';
import {
  GWP100,
  type CountryResult,
  type Options,
  type Scenario,
  type ScenarioResult,
  type Summary,
} from './api';
import { shapley } from './attribution';
import { bandRecord } from './bands';
import { BANDS, populationAdjustmentEmissions, warmingFrom, type Band } from './climate';
import { foodChange, perCapitaPerDay } from './diet';
import { countryIntensities, cutEmissions, emissionsOf, worstIntensity } from './emissions';
import { feedChange, feedSharesOf, groupProductionChange } from './feed';
import { addLand, countryLand, landChangeOf, NO_LAND, type CakeDemand } from './land';
import { clipChange, locateAll } from './location';
import { groupTotals, prepare, type Prepared, type PreparedCountry } from './prepare';
import { baselineScale, ramp, tabulate, type Scale } from './timePath';
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
  /**
   * Supply change of the animal (or plant) items from their change in end use (`endUse` plus
   * `extra`), less the losses no longer incurred.
   */
  const toSupply = (c: number, isAnimal: boolean, endUse: ItemVector, extra?: ItemVector) => {
    const m = multipliers[c] as ItemVector;
    const lost = avoided?.[c];
    const want = isAnimal ? 1 : 0;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++)
      if (animal[i] === want) {
        const d = extra ? (endUse[i] as number) + (extra[i] as number) : (endUse[i] as number);
        out[i] = lost ? d * (m[i] as number) - (lost[i] as number) : d * (m[i] as number);
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
  const animals = clipAll(countries, located(used.map((u, c) => toSupply(c, true, u))), emitting);
  const feed = countries.map((pc, c) =>
    feedChange(
      pc,
      groupProductionChange(pc.production, animals.change[c] as ItemVector, prepared),
      prepared,
      options.feed,
    ),
  );
  const plants = clipAll(
    countries,
    located(used.map((u, c) => toSupply(c, false, u, feed[c]))),
    emitting,
  );
  /**
   * Fish are feed items too (fishmeal): their feed use follows the groups they feed, once. The
   * fish caught for meal are wild and not fed, so this change does not feed back into feed.
   */
  const fishDemand = feed.map((f, c) => {
    const m = multipliers[c] as ItemVector;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) if (animal[i] === 1) out[i] = (f[i] as number) * (m[i] as number);
    return out;
  });
  const fish = clipAll(
    countries,
    located(fishDemand),
    emitting.map((e, c) => addVectors(e, animals.change[c] as ItemVector)),
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
      production: groupTotals(pc.production, prepared),
      emissions: emissionsOf(pc.emitting, intensities),
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
const combine = (chains: readonly SupplyChain[]): SupplyChain =>
  chains.reduce<SupplyChain>((a, c) => {
    const [used, before] = [c.used, a.used];
    const [lost, lostBefore] = [c.avoidedLosses, a.avoidedLosses];
    return {
      used: used && before ? (pc, food) => used(pc, before(pc, food)) : (used ?? before),
      multipliers: c.multipliers ?? a.multipliers,
      avoidedLosses:
        lost && lostBefore ? (pc) => addVectors(lostBefore(pc), lost(pc)) : (lost ?? lostBefore),
    };
  }, {});

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

/** The modules that change the supply chain in this run, in registry order. */
const chainsOf = (ctx: RunContext): Chain[] =>
  MODULES.flatMap((m) => {
    const used = m.hooks.demand?.(ctx) ?? null;
    const chain = m.hooks.supplyChain?.(ctx) ?? null;
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
  /** Farm emissions a module's cut in intensity removes, by band. */
  cuts: Readonly<Record<string, Partial<Record<Band, GasVector>>>>;
  /** CO₂ a year as a constant stream, such as clearing, by the cause it counts in and family. */
  co2: ByCause<Readonly<Record<string, number>>>;
}

interface IntensityCut {
  family: string;
  cut: (pc: PreparedCountry, band: Band) => Record<Gas, ItemVector>;
}

interface CountryHook {
  cause: LeverCause;
  hook: (c: CountryContext) => CountryPart;
}

const addRecords = (parts: readonly CountryPart[]): Record<string, number> =>
  parts.reduce<Record<string, number>>(
    (acc, p) =>
      Object.entries(p.co2 ?? {}).reduce(
        (a, [k, v]) => ({ ...a, [k]: k in a ? (a[k] as number) + v : v }),
        acc,
      ),
    {},
  );

const countryParts = (
  pc: PreparedCountry,
  /** The diet's change in food, or null where the diet is not read (a pass of the breakdown). */
  food: ItemVector | null,
  stages: readonly Stage[],
  prepared: Prepared,
  options: Options,
  intensityCuts: readonly IntensityCut[],
  countryHooks: readonly CountryHook[],
  cake: CakeDemand,
  bands: readonly Band[],
): CountryParts => {
  const base = countryBase(pc, prepared, options.scope);
  const intensities = countryIntensities(pc, prepared, options.scope);
  const change = (stages[stages.length - 1] as Stage).change;
  const productionChange = groupTotals(change, prepared);
  const emitted = stages.map((s) => emissionsOf(s.change, intensities));
  const total = emitted[emitted.length - 1] as GasVector;
  const farm = Object.fromEntries(
    stages.map((s, k) => {
      const own = emitted[k] as GasVector;
      const before = emitted[k - 1];
      return [s.family, before ? gasVector((g) => own[g] - before[g]) : own];
    }),
  );
  const after = intensityCuts.length > 0 ? addVectors(pc.emitting, change) : pc.emitting;
  const cuts = Object.fromEntries(
    intensityCuts.map(({ family, cut }) => [
      family,
      Object.fromEntries(
        bands.map((band) => [band, cutEmissions(after, intensities, cut(pc, band))]),
      ),
    ]),
  );
  const land = countryLand(pc, prepared).base;
  const landChange = landChangeOf(pc, change, productionChange, prepared, cake);
  const extra = countryHooks.map(({ hook }) => hook({ pc, stages, land, landChange }));
  return {
    result: Object.assign(
      {
        iso3: pc.country.iso3,
        ...base,
        productionChange,
        emissionsChange: Object.values(cuts).reduce(
          (a, c) => (c.median ? addGas(a, c.median) : a),
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
      },
      ...extra.map((e) => e.result ?? {}),
    ) as CountryResult,
    farm,
    cuts,
    co2: causeRecord((cause) =>
      addRecords(extra.filter((_, k) => countryHooks[k]?.cause === cause)),
    ),
  };
};

const farmOf = (p: CountryParts, family: string, band: Band): GasVector =>
  p.cuts[family]?.[band] ?? p.farm[family] ?? ZERO_GAS;

/**
 * Yearly emission changes of one family: farm emissions scale like the baseline, clearing is a
 * constant stream; both ramp in like the shift.
 */
const familyPath = (
  farm: GasVector,
  clearing: number,
  years: readonly number[],
  scale: Scale,
  shareAt: (year: number) => number,
): GasVector[] =>
  years.map((y) => {
    const r = shareAt(y);
    return gasVector((g) => r * (farm[g] * scale(g, y) + (g === 'co2' ? clearing : 0)));
  });

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
 * Each family's avoided warming at each horizon with the feedback (permafrost) shared out in
 * proportion to it, so the shares still add up to the total; nothing is shared where the
 * families' total is nil.
 */
export const shareFeedback = (
  familyWarming: readonly number[][],
  feedback: readonly number[],
): number[][] =>
  familyWarming.map((w) =>
    w.map((v, h) => {
      const total = sum(familyWarming.map((f) => f[h] ?? 0));
      return Math.abs(total) > 0 ? v + ((feedback[h] ?? 0) * v) / total : v;
    }),
  );

interface BaselineBand {
  /** Population baseline's farm warming, °C by year. */
  adjustment: number[];
  /** The baseline temperature. */
  temperature: number[];
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
): Readonly<Record<number, number>> =>
  MODULES.reduce<Readonly<Record<number, number>> | null>(
    (found, m) => found ?? m.hooks.population?.({ prepared, options }) ?? null,
    null,
  ) ?? prepared.worldPopulation;

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
      currentYear,
    ].join('|'),
    () => {
      const { climate } = prepared.data;
      const tYears = range(FIRST_YEAR, END_YEAR);
      const total = climate.scenarioTemperature[options.ssp];
      const scale = baselineScale(
        options.baseline,
        climate,
        worldPopulationOf(prepared, options),
        prepared.baseYear,
      );
      const adjustmentEmissions =
        options.baseline === 'population'
          ? populationAdjustmentEmissions(climate, options.ssp, prepared.baseYear, (y) =>
              scale('co2', y),
            )
          : [];
      return bandRecord((band) => {
        const adjustment =
          adjustmentEmissions.length > 0
            ? warmingFrom(
                adjustmentEmissions,
                prepared.baseYear,
                climate,
                options.climate,
                band,
                tYears,
              )
            : zerosOn(tYears);
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
                  adjustment,
                  temperature: part.warming
                    ? addSeries(acc.temperature, part.warming)
                    : acc.temperature,
                  memo: { ...acc.memo, [m.id]: part.memo },
                }
              : acc;
          },
          {
            adjustment,
            temperature: addSeries(seriesOn(total, total[band], tYears), adjustment),
            memo: {},
          },
        );
      });
    },
  );

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

/** Whether a module that is not farming has a lever adopted. */
const nonFarmOn = (adoption: (id: string) => number): boolean =>
  MODULES.some((m) => m.farm === false && m.levers.some((l) => adoption(l.id) > 0));

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
  ...(module.family && part.extraWarming && causeOfModule(module) === cause
    ? [part.extraWarming[band]]
    : []),
  ...(module.family && part.warmingByCause?.[cause] ? [part.warmingByCause[cause][band]] : []),
];

const zeroPaths = memoPer<readonly number[], GasVector[]>();
const zeroPath = (years: readonly number[]): GasVector[] =>
  zeroPaths(years, 'zero', () => years.map(() => ZERO_GAS));

interface PassFrame {
  ctx: RunContext;
  years: readonly number[];
  tYears: readonly number[];
  scale: Scale;
  shareAt: (year: number) => number;
  completeIndex: number;
}

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
  const last = (steps[steps.length - 1] as Step).run;
  const cakeOf = cakeDemandOf(prepared, options, last.change);
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
      cakeOf(pc),
      bands,
    ),
  );
  const countries = parts.map((p) => p.result);
  const world = modules.map((module) => ({
    module,
    part: module.hooks.world?.(ctx, { countries, years, tYears, shareAt, completeIndex }) ?? {},
  }));
  const ownOf = (family: string) => world.find((w) => w.module.family === family);
  const pathsIn = (band: Band): Record<string, ByCause<GasVector[]>> =>
    Object.fromEntries(
      FAMILIES.map((f) => {
        const own = ownOf(f);
        const extra = own?.part.extraEmissions?.[band];
        if (extra && own) {
          const cause = causeOfModule(own.module);
          return [f, causeRecord((c) => (c === cause ? extra : zeroPath(years)))];
        }
        return [
          f,
          causeRecord((c) => {
            if (c === 'agriculture') {
              const farm = sumBy(parts, (p) => farmOf(p, f, band));
              return GASES.every((g) => farm[g] === 0)
                ? zeroPath(years)
                : familyPath(farm, 0, years, scale, shareAt);
            }
            const clearing = sum(parts.map((p) => p.co2[c][f] ?? 0));
            return clearing === 0
              ? zeroPath(years)
              : familyPath(ZERO_GAS, clearing, years, scale, shareAt);
          }),
        ];
      }),
    );
  return {
    parts,
    countries,
    world,
    paths: Object.fromEntries(bands.map((b) => [b, pathsIn(b)])),
  };
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
    const extraAt = (year: number) => sum(extras.map((e) => e[year - FIRST_YEAR] ?? 0));
    const atEnd = path[completeIndex];
    return [
      0 - ((warming[0] ?? 0) + extraAt(HORIZON_YEARS[0] as number)),
      0 - ((warming[1] ?? 0) + extraAt(HORIZON_YEARS[1] as number)),
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
  const production = [...(dietActs(ctx.scenario) ? ['diet'] : []), ...chains.map((c) => c.family)];
  const farmModules = MODULES.filter((m) => m.family && m.farm !== false);
  const dependent = farmModules
    .filter((m) => !production.includes(familyOf(m)) && acts(m, ctx))
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
    if (key === fullKey) return fullValues;
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
                frame,
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
        part:
          module.hooks.world?.(masked, {
            countries: full.countries,
            years,
            tYears,
            shareAt,
            completeIndex,
          }) ?? {},
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
export const runPrepared = (
  prepared: Prepared,
  scenario: Scenario,
  options: Options,
  currentYear: number,
): ScenarioResult => {
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
      options.baseline,
      climate,
      worldPopulationOf(prepared, options),
      prepared.baseYear,
    ),
    years,
  );
  const shareAt = (y: number) => (y < currentYear ? 0 : ramp(y, currentYear, scenario.rampEnd));
  const completeIndex = Math.min(Math.max(scenario.rampEnd, currentYear), END_YEAR) - currentYear;
  const frame: PassFrame = { ctx, years, tYears, scale, shareAt, completeIndex };
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
  const farmOnly = nonFarmOn(ctx.adoption);
  const farmPaths = () => sumPaths(FARM_FAMILIES.map((f) => byFamily.median[f] ?? []));
  const farmDifference = farmOnly ? farmPaths() : differenceIn.median;

  const base = baselineTemperature(prepared, options, currentYear);
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
  const agriculture = climate.attribution[options.ssp].agriculture;
  const agricultureBaseline = addSeries(
    seriesOn(agriculture, agriculture.median, tYears),
    base.median.adjustment,
  );
  const farmDelta = farmOnly
    ? warmingFrom(farmPaths(), currentYear, climate, options.climate, 'median', tYears)
    : leversDelta.median;

  const avoidedAt = differenceIn.median[completeIndex];
  const avoided = avoidedAt ? gasVector((g) => 0 - avoidedAt[g]) : ZERO_GAS;
  const avoidedIn = (year: number) => {
    const values = BANDS.map((band) => 0 - (delta[band][year - FIRST_YEAR] ?? 0));
    const range95 = values.slice(1);
    return { median: values[0] ?? 0, p05: Math.min(...range95), p95: Math.max(...range95) };
  };

  const causeChange = causeRecord((c) =>
    addSeries(
      warmingFrom(
        sumPaths(FAMILIES.map((f) => full.paths.median?.[f]?.[c] ?? [])),
        currentYear,
        climate,
        options.climate,
        'median',
        tYears,
      ),
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

  const shares = familyShares(frame, full, chains);
  const feedbackAt = HORIZON_YEARS.map((y) => 0 - (feedbackDelta.median[y - FIRST_YEAR] ?? 0));
  const sharedAt = HORIZON_YEARS.map((_, h) =>
    sum([...shares.values()].flatMap((v) => COUNTED_CAUSES.map((_, c) => v[c * 3 + h] ?? 0))),
  );
  /** A family's avoided warming at horizon h for a cause, with its part of the feedback. */
  const warmingOf = (family: string, c: number, h: number): number => {
    const own = shares.get(family)?.[c * 3 + h] ?? 0;
    const total = sharedAt[h] as number;
    return Math.abs(total) > 0 ? own + ((feedbackAt[h] as number) * own) / total : own;
  };
  const co2eOfFamily = (family: string, c: number): number => shares.get(family)?.[c * 3 + 2] ?? 0;
  const perFamily = (f: (family: string) => number): Record<string, number> =>
    Object.fromEntries(FAMILIES.map((family) => [family, f(family)]));
  const byCauseOf = (f: (family: string, c: number) => number) =>
    Object.fromEntries(
      FAMILIES.map((family) => [family, causeRecord((c) => f(family, COUNTED_CAUSES.indexOf(c)))]),
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
      agricultureBaseline,
      agricultureScenario: addSeries(agricultureBaseline, farmDelta),
      avoided: avoidedBand(delta),
      avoidedByCause,
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
