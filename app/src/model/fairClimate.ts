// The temperature from FaIR run in the model itself (issue #66), on the members fair.json gives,
// with the internal variability off: the baseline once per SSP and options, carried on from the
// current year for each scenario. A change in emissions is a change in FaIR's CO₂, methane, N₂O
// and HFC-134a emissions; the other species keep the SSP's.

import { GASES, type BandSeries, type FairFile, type Gas, type GasVector } from '../data/types';
import { loadModel, type Model } from './fair/calibration';
import * as ensembleModule from './fair/ensemble';
import { memberOf, runMember, type Member, type MemberState } from './fair/member';
import { prepareScenario, type PreparedScenario, type ScenarioInput } from './fair/scenario';
import { cachedIn, END_YEAR } from './util';

const START = 1750;
const STEPS = END_YEAR - START + 1;
const BASELINE_FIRST = 1850;
const BASELINE_LAST = 1900;
// Read once: a module binding is a getter in some loaders (vitest's), too slow for the inner loop.
const { percentile } = ensembleModule;

/** The FaIR specie each of the model's gases is, and how many kg its emission unit is. */
const SPECIE: Record<Gas, string> = { co2: 'CO2 FFI', ch4: 'CH4', n2o: 'N2O', hfc: 'HFC-134a' };
const KG_PER_UNIT: Record<Gas, number> = { co2: 1e12, ch4: 1e9, n2o: 1e9, hfc: 1e6 };

export type Ensemble = { file: FairFile; model: Model; members: Member[] };

const ensembles = new WeakMap<FairFile, Ensemble>();

/** The model and its compiled members, once per file. */
export const ensembleOf = (file: FairFile): Ensemble =>
  cachedIn(ensembles, file, () => {
    const model = loadModel(file);
    return { file, model, members: model.members.map((p) => memberOf(model, p)) };
  });

/**
 * `base` with each gas's `changes` (kg a year, the first in `first`) added to its FaIR specie;
 * net CO₂ may go below zero, and so may HFC-134a, which carries every HFC's change as the stream
 * with the same forcing (levers/hfc); the other gases stop at zero as the pipeline's attribution
 * runs do.
 */
export const withChanges = (
  base: ScenarioInput,
  changes: readonly (readonly GasVector[])[],
  first: number,
): ScenarioInput => {
  const changed = (g: Gas): number[] => {
    const series = Array.from(base.emissions[SPECIE[g]] as ArrayLike<number>);
    changes.forEach((path) =>
      path.forEach((v, k) => {
        const t = first + k - START;
        const next = (series[t] as number) + v[g] / KG_PER_UNIT[g];
        series[t] = g === 'co2' || g === 'hfc' ? next : Math.max(0, next);
      }),
    );
    return series;
  };
  const moved = GASES.filter((g) => changes.some((path) => path.some((v) => v[g] !== 0)));
  return {
    ...base,
    emissions: {
      ...base.emissions,
      ...Object.fromEntries(moved.map((g) => [SPECIE[g], changed(g)])),
    },
  };
};

/** Each member's surface temperature (K) and CO₂ (ppm) at the timebounds from 1750. */
export type FairRuns = { temperature: Float64Array[]; co2: Float64Array[] };

export type FairBaseline = FairRuns & {
  input: ScenarioInput;
  prepared: PreparedScenario;
  /** Each member's state at the start of `fromYear`, which scenarios carry on from. */
  states: MemberState[];
  fromYear: number;
  /** Each member's `fixedForcing` at every timepoint, which a scenario on the same emissions of
   * the species it reads reuses. */
  fixed: Float64Array[];
};

/** The start of 2022, the calibration's last year of history: the SSPs and every baseline share
 * their emissions up to there, so their runs share that stretch. */
const HISTORY = 2022 - START;

/** Every member run to HISTORY on one input. */
type History = {
  input: ScenarioInput;
  prepared: PreparedScenario;
  states: MemberState[];
  temperature: Float64Array[];
  co2: Float64Array[];
  fixed: Float64Array[];
};

const histories = new WeakMap<Ensemble, History[]>();

const samePrefix = (
  a: ArrayLike<number> | undefined,
  b: ArrayLike<number> | undefined,
  until: number,
): boolean => {
  let same = a === b || (a !== undefined && b !== undefined);
  for (let t = 0; same && a !== b && t < until; t++) {
    same = Object.is((a as ArrayLike<number>)[t], (b as ArrayLike<number>)[t]);
  }
  return same;
};

/** Whether two inputs have the same emissions and land-use forcing up to HISTORY. */
const sameHistory = (model: Model, a: ScenarioInput, b: ScenarioInput): boolean =>
  samePrefix(a.landUse, b.landUse, HISTORY + 2) &&
  model.names.every((name) => samePrefix(a.emissions[name], b.emissions[name], HISTORY));

const historyOf = (ensemble: Ensemble, input: ScenarioInput): History => {
  const known = histories.get(ensemble) ?? [];
  const found = known.find((h) => sameHistory(ensemble.model, h.input, input));
  return found ?? remembered(ensemble, known, historyRun(ensemble, input));
};

const remembered = (ensemble: Ensemble, known: History[], history: History): History => {
  histories.set(ensemble, [...known, history]);
  return history;
};

const historyRun = (ensemble: Ensemble, input: ScenarioInput): History => {
  const { model, members } = ensemble;
  const prepared = prepareScenario(model, input, STEPS);
  const fixed = members.map(() => new Float64Array(STEPS));
  const runs = members.map((m, k) =>
    runMember(model, m, prepared, undefined, HISTORY, {
      values: fixed[k] as Float64Array,
      known: false,
    }),
  );
  return {
    input,
    prepared,
    states: runs.map((r) => r.state),
    temperature: runs.map((r) => r.temperature),
    co2: runs.map((r) => r.co2),
    fixed,
  };
};

/** `history` up to its end, then `parts` each on from the previous one's end. */
const joined = (history: Float64Array, ...parts: Float64Array[]): Float64Array => {
  const out = Float64Array.from(history);
  parts.forEach((part) => {
    for (let t = 0; t < out.length; t++) {
      out[t] = out[t] !== out[t] ? (part[t] as number) : (out[t] as number);
    }
  });
  return out;
};

/** `input` (the SSP and what the baseline adds to it) run on every member, each member's state
 * kept at the start of `fromYear`; the stretch up to HISTORY is run once for every input that
 * shares it. */
export const fairBaseline = (
  ensemble: Ensemble,
  input: ScenarioInput,
  fromYear: number,
): FairBaseline => {
  const { model, members } = ensemble;
  const bound = fromYear - START;
  const history = historyOf(ensemble, input);
  const prepared = prepareScenario(model, input, STEPS, history.prepared, HISTORY);
  const runs = members.map((m, k) => {
    const fixed = { values: Float64Array.from(history.fixed[k] as Float64Array), known: false };
    const before = runMember(model, m, prepared, history.states[k], bound, fixed);
    const after = runMember(model, m, prepared, before.state, STEPS, fixed);
    return {
      temperature: joined(
        history.temperature[k] as Float64Array,
        before.temperature,
        after.temperature,
      ),
      co2: joined(history.co2[k] as Float64Array, before.co2, after.co2),
      state: before.state,
      fixed: fixed.values,
    };
  });
  return {
    input,
    prepared,
    fromYear,
    states: runs.map((r) => r.state),
    temperature: runs.map((r) => r.temperature),
    co2: runs.map((r) => r.co2),
    fixed: runs.map((r) => r.fixed),
  };
};

/** The species whose emissions `fixedForcing` reads, by name. */
const fixedReads = (ensemble: Ensemble): string[] => {
  const m = ensemble.members[0] as Member;
  const species = [
    ...m.ari.emissions.species,
    ...m.aci.emissions.species,
    ...m.ozone.emissions.species,
    ...m.lapsi.species,
    ...m.landUse.species,
  ];
  return [...new Set(species)].map((s) => ensemble.model.names[s] as string);
};

/** Whether a scenario's `fixedForcing` is its baseline's: the same series of every specie it
 * reads, and the same land-use forcing. */
const sameFixed = (ensemble: Ensemble, a: ScenarioInput, b: ScenarioInput): boolean =>
  a.landUse === b.landUse &&
  fixedReads(ensemble).every((name) => a.emissions[name] === b.emissions[name]);

/** The baseline with `changes` (kg a year by gas from the baseline's `fromYear`) on every member. */
export const fairScenario = (
  ensemble: Ensemble,
  baseline: FairBaseline,
  changes: readonly GasVector[],
): FairRuns => {
  const { model, members } = ensemble;
  const input = withChanges(baseline.input, [changes], baseline.fromYear);
  const bound = baseline.fromYear - START;
  const prepared = prepareScenario(model, input, STEPS, baseline.prepared, bound);
  const reuse = sameFixed(ensemble, input, baseline.input);
  const runs = members.map((m, k) =>
    runMember(model, m, prepared, baseline.states[k] as MemberState, STEPS, {
      values: reuse ? (baseline.fixed[k] as Float64Array) : new Float64Array(STEPS),
      known: reuse,
    }),
  );
  // The runs are this function's own: the baseline's years before `bound` are copied into them.
  const join = (before: Float64Array | undefined, after: Float64Array) => {
    after.set((before as Float64Array).subarray(0, bound));
    return after;
  };
  return {
    temperature: runs.map((r, k) => join(baseline.temperature[k], r.temperature)),
    co2: runs.map((r, k) => join(baseline.co2[k], r.co2)),
  };
};

/** A member's calendar-year mean of values at timebounds, `year` from 1750 on. */
const meanIn = (bounds: Float64Array, year: number): number =>
  0.5 * ((bounds[year - START] as number) + (bounds[year - START + 1] as number));

/** A member's 1850–1900 mean surface temperature, which its warming is counted from. */
const preindustrial = (bounds: Float64Array): number => {
  let sum = 0;
  for (let y = BASELINE_FIRST; y <= BASELINE_LAST; y++) {
    sum += meanIn(bounds, y);
  }
  return sum / (BASELINE_LAST - BASELINE_FIRST + 1);
};

/**
 * Sorts `order` (member indices) by `values`, by insertion: the members' order barely changes
 * from one year to the next, so starting from last year's it takes a pass or two.
 */
const sortOrder = (order: Int32Array, values: Float64Array): void => {
  for (let i = 1; i < order.length; i++) {
    const k = order[i] as number;
    const v = values[k] as number;
    let j = i - 1;
    while (j >= 0 && (values[order[j] as number] as number) > v) {
      order[j + 1] = order[j] as number;
      j--;
    }
    order[j + 1] = k;
  }
};

/** The 5th, 50th and 95th percentiles across members of `value(member, year)` on `years`. */
const bandOf = (
  count: number,
  years: readonly number[],
  value: (k: number, year: number) => number,
): BandSeries => {
  const column = new Float64Array(count);
  const sorted = new Float64Array(count);
  const order = Int32Array.from({ length: count }, (_, k) => k);
  const median = new Array<number>(years.length);
  const p05 = new Array<number>(years.length);
  const p95 = new Array<number>(years.length);
  years.forEach((y, i) => {
    for (let k = 0; k < count; k++) {
      column[k] = value(k, y);
    }
    sortOrder(order, column);
    order.forEach((k, j) => (sorted[j] = column[k] as number));
    const at = (q: number) => percentile(sorted, q);
    median[i] = at(50);
    p05[i] = at(5);
    p95[i] = at(95);
  });
  return { years: [...years], median, p05, p95 };
};

const offsetsCache = new WeakMap<Float64Array[], Float64Array>();

/** Each member's 1850–1900 mean, once per set of runs. */
const offsetsOf = (temperature: Float64Array[]): Float64Array =>
  cachedIn(offsetsCache, temperature, () => Float64Array.from(temperature, preindustrial));

/** Warming, °C above each member's 1850–1900 mean, across members on `years`. */
export const warmingBand = (runs: FairRuns, years: readonly number[]): BandSeries => {
  const offsets = offsetsOf(runs.temperature);
  return bandOf(
    runs.temperature.length,
    years,
    (k, y) => meanIn(runs.temperature[k] as Float64Array, y) - (offsets[k] as number),
  );
};

/** The warming the scenario avoids, member by member, across members on `years`. */
export const avoidedBand = (
  baseline: FairRuns,
  scenario: FairRuns,
  years: readonly number[],
): BandSeries =>
  bandOf(
    baseline.temperature.length,
    years,
    (k, y) =>
      meanIn(baseline.temperature[k] as Float64Array, y) -
      meanIn(scenario.temperature[k] as Float64Array, y),
  );

/** CO₂ in the air, ppm, across members on `years`. */
export const co2Band = (runs: FairRuns, years: readonly number[]): BandSeries =>
  bandOf(runs.co2.length, years, (k, y) => meanIn(runs.co2[k] as Float64Array, y));

const baselineBands = new WeakMap<FairBaseline, { warming: BandSeries; co2: BandSeries }>();

/** The baseline's warming and CO₂ across members from FIRST_YEAR, once per baseline. */
export const baselineBandsOf = (baseline: FairBaseline, years: readonly number[]) =>
  cachedIn(baselineBands, baseline, () => ({
    warming: warmingBand(baseline, years),
    co2: co2Band(baseline, years),
  }));

/** `later` on the last years of `years`, `before` (a band on `years`) on those before it. */
const spliced = (before: BandSeries, later: BandSeries, years: readonly number[]): BandSeries => {
  const cut = years.length - later.years.length;
  const join = (a: number[], b: number[]) => [...a.slice(0, cut), ...b];
  return {
    years: [...years],
    median: join(before.median, later.median),
    p05: join(before.p05, later.p05),
    p95: join(before.p95, later.p95),
  };
};

const zeroBand = (years: readonly number[]): BandSeries => {
  const zeros = years.map(() => 0);
  return { years: [...years], median: zeros, p05: zeros, p95: zeros };
};

/**
 * The scenario's warming, the warming it avoids member by member, and its CO₂, across members on
 * `years`: worked out from the baseline's `fromYear` only, as nothing changes before it, and not
 * run at all when `changes` changes nothing.
 */
export const scenarioBands = (
  ensemble: Ensemble,
  baseline: FairBaseline,
  changes: readonly GasVector[],
  years: readonly number[],
) => {
  const base = baselineBandsOf(baseline, years);
  const still = changes.every((v) => GASES.every((g) => v[g] === 0));
  const runs = still ? baseline : fairScenario(ensemble, baseline, changes);
  const later = years.filter((y) => y >= baseline.fromYear);
  const offsets = offsetsOf(baseline.temperature);
  const warming = bandOf(
    runs.temperature.length,
    later,
    (k, y) => meanIn(runs.temperature[k] as Float64Array, y) - (offsets[k] as number),
  );
  return {
    warming: spliced(base.warming, warming, years),
    avoided: spliced(zeroBand(years), avoidedBand(baseline, runs, later), years),
    co2: spliced(base.co2, co2Band(runs, later), years),
  };
};
