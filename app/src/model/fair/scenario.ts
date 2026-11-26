// The member-independent part of a FaIR run: a scenario's emissions, the gases whose cycle no
// member changes (N₂O and the halogenated gases), EESC from them, and methane's lifetime terms
// from those, prepared once and shared by every member.

import { GASBOXES, type MemberParams, type Model } from './calibration';
import * as forcingModule from './forcing';
import * as gasCycleModule from './gasCycle';

// Read once: a module binding is a getter in some loaders, too slow for the inner loop.
const BOXES: number = GASBOXES;
const { minorForcing, orZero } = forcingModule;
const { alphaOf, ch4LogTerm, eescTerm, stepBox } = gasCycleModule;

/** Emissions per FaIR specie in FaIR's units, one value per calendar year from 1750; `landUse`,
 * when given, prescribes the land-use forcing (W m⁻², calendar years) as climate_fair does. */
export type ScenarioInput = {
  emissions: Readonly<Record<string, ArrayLike<number>>>;
  landUse?: ArrayLike<number>;
};

export type PreparedScenario = {
  /** Timepoints (years) run; timebounds are one more. */
  steps: number;
  /** [timepoint × specie]: NaN where a specie has no emissions. */
  emissions: Float64Array;
  /** [timebound × specie] */
  cumulative: Float64Array;
  /** [timebound × specie]: the fixed gases and EESC, NaN elsewhere. */
  fixedConcentration: Float64Array;
  /** Methane's log lifetime scaling from the emissions and the fixed concentrations, per
   * timepoint. */
  ch4Fixed: Float64Array;
  /** [timebound × group of `Model.minorGroups`]: the group's forcing less its baseline's, times
   * its efficacy, before the member's scale. */
  minorForcing: Float64Array;
  /** Unscaled prescribed forcing at timebounds, 0 at the first as climate_fair initialises it. */
  volcanic: Float64Array;
  solar: Float64Array;
  landUse: Float64Array | null;
};

/** climate_fair's `at_bounds`: calendar-year values read at FaIR's year boundaries, each year's
 * at mid-year, held flat beyond the ends. */
export const atBounds = (annual: ArrayLike<number>, bounds: number): Float64Array => {
  const last = annual.length - 1;
  const value = (k: number) => annual[Math.min(Math.max(k, 0), last)] as number;
  return Float64Array.from({ length: bounds }, (_, t) =>
    t === 0 || t > last
      ? value(t - 1 + Number(t === 0))
      : value(t - 1) + 0.5 * (value(t) - value(t - 1)),
  );
};

/** climate_fair's `annual_means`: calendar-year means from values at year boundaries. */
export const annualMeans = (bounds: Float64Array): Float64Array =>
  Float64Array.from(
    { length: bounds.length - 1 },
    (_, t) => 0.5 * ((bounds[t + 1] as number) + (bounds[t] as number)),
  );

const zeroFirst = (values: Float64Array): Float64Array => values.map((v, t) => (t === 0 ? 0 : v));

/** [timepoint × specie] emissions, CO₂ the sum of its fossil and AFOLU parts as FaIR makes it. */
const emissionMatrix = (
  model: Model,
  input: ScenarioInput,
  steps: number,
  prior: Prior,
): Float64Array => {
  const n = model.names.length;
  const { co2, co2Ffi, co2Afolu } = model.index;
  const from = prior?.from ?? 0;
  const out = prior ? Float64Array.from(prior.base.emissions) : new Float64Array(steps * n);
  model.names.forEach((name, s) => {
    const series = input.emissions[name];
    for (let t = from; t < steps; t++) {
      out[t * n + s] = series ? (series[t] as number) : NaN;
    }
  });
  for (let t = from; t < steps; t++) {
    out[t * n + co2] = (out[t * n + co2Ffi] as number) + (out[t * n + co2Afolu] as number);
  }
  return out;
};

const cumulativeMatrix = (
  emissions: Float64Array,
  n: number,
  steps: number,
  prior: Prior,
): Float64Array => {
  const out = new Float64Array((steps + 1) * n);
  const from = prior?.from ?? 0;
  out.set((prior?.base.cumulative ?? out).subarray(0, (from + 1) * n));
  for (let k = (from + 1) * n; k < out.length; k++) {
    out[k] = (out[k - n] as number) + (emissions[k - n] as number);
  }
  return out;
};

/**
 * Steps a gas's boxes (from `at` in `box`) in place over one year and returns its airborne burden after it. A box
 * with no share of the emissions stays empty, so it is skipped.
 */
export const advanceBoxes = (
  box: Float64Array,
  at: number,
  p: MemberParams,
  s: number,
  emission: number,
  alpha: number,
): number => {
  let airborne = 0;
  for (let b = 0; b < BOXES; b++) {
    const k = s * BOXES + b;
    const partition = p.partition[k] as number;
    if (partition !== 0) {
      const lifetime = p.lifetime[k] as number;
      const old = box[at + b] as number;
      box[at + b] = stepBox(
        old,
        emission,
        p.baselineEmissions[s] as number,
        partition,
        lifetime,
        alpha,
      );
    }
    airborne += box[at + b] as number;
  }
  return airborne;
};

/**
 * One fixed gas's concentration at every timebound, written into `out` ([timebound × specie]).
 * Its lifetime scaling is fixed, so each box's decay is worked out once; the step is
 * `stepBox`'s, term for term.
 */
const fixedGas = (
  model: Model,
  p: MemberParams,
  emissions: Float64Array,
  steps: number,
  s: number,
  out: Float64Array,
): void => {
  const n = model.names.length;
  const alpha = alphaOf(p.iirf0[s] as number, p.g0[s] as number, p.g1[s] as number);
  const base = p.baselineConcentration[s] as number;
  const perEmission = model.concentrationPerEmission[s] as number;
  const baselineEmission = p.baselineEmissions[s] as number;
  const used = [0, 1, 2, 3].filter((b) => p.partition[s * BOXES + b] !== 0);
  const partition = used.map((b) => p.partition[s * BOXES + b] as number);
  const rate = used.map((b) => 1 / (alpha * (p.lifetime[s * BOXES + b] as number)));
  const decay = rate.map((r) => Math.exp(-r));
  const box = new Float64Array(used.length);
  out[s] = base;
  for (let t = 0; t < steps; t++) {
    const emission = emissions[t * n + s] as number;
    let airborne = 0;
    for (let k = 0; k < box.length; k++) {
      const d = decay[k] as number;
      box[k] =
        (((partition[k] as number) * (emission - baselineEmission) * 1) / (rate[k] as number)) *
          (1 - d) *
          1 +
        (box[k] as number) * d;
      airborne += box[k] as number;
    }
    out[(t + 1) * n + s] = base + perEmission * airborne;
  }
};

/** Whether specie s has the same emissions in two [timepoint × specie] matrices. */
const sameEmissions = (a: Float64Array, b: Float64Array, n: number, s: number): boolean => {
  let same = a.length === b.length;
  for (let k = s; same && k < a.length; k += n) {
    same = Object.is(a[k], b[k]);
  }
  return same;
};

/** The fixed gases' and EESC's concentrations; a gas whose emissions are those of `base`, a
 * scenario prepared before, is copied from it. */
const fixedConcentrations = (
  model: Model,
  p: MemberParams,
  emissions: Float64Array,
  steps: number,
  base: PreparedScenario | null,
  prior: Prior,
): Float64Array => {
  const n = model.names.length;
  const out = new Float64Array((steps + 1) * n).fill(NaN);
  const reused = (s: number) =>
    base !== null && base.steps === steps && sameEmissions(emissions, base.emissions, n, s);
  model.fixed.forEach((s) =>
    reused(s)
      ? copyColumn(base as PreparedScenario, out, n, s)
      : fixedGas(model, p, emissions, steps, s, out),
  );
  const { eesc } = model.index;
  const from = prior?.from ?? 0;
  out[eesc] = p.baselineConcentration[eesc] as number;
  for (let t = 1; t <= from; t++) {
    out[t * n + eesc] = (prior as Exclude<Prior, null>).base.fixedConcentration[
      t * n + eesc
    ] as number;
  }
  for (let t = from + 1; t <= steps; t++) {
    out[t * n + eesc] = eescAt(model, p, out, t * n);
  }
  return out;
};

const copyColumn = (base: PreparedScenario, out: Float64Array, n: number, s: number): void => {
  for (let k = s; k < out.length; k += n) {
    out[k] = base.fixedConcentration[k] as number;
  }
};

const eescAt = (model: Model, p: MemberParams, conc: Float64Array, at: number): number => {
  const cfc11Release = p.fractionalRelease[model.index.cfc11] as number;
  const { halogens, clAtoms, brAtoms } = model;
  let sum = 0;
  for (const h of halogens) {
    const c = conc[at + h] as number;
    const release = p.fractionalRelease[h] as number;
    sum += orZero(eescTerm(c, clAtoms[h] as number, brAtoms[h] as number, release, cfc11Release));
  }
  return sum;
};

/** The species methane's lifetime reads from a concentration that no member changes. */
export const fixedChemistry = (model: Model): number[] =>
  model.fromConcentration.filter((s) => s === model.index.eesc || model.fixed.includes(s));

/** Σ over `species` of methane's log lifetime terms of values[at + s]. */
const ch4Terms = (
  species: readonly number[],
  values: Float64Array,
  at: number,
  baseline: Float64Array,
  sensitivity: Float64Array,
): number => {
  let sum = 0;
  for (const s of species) {
    sum += ch4LogTerm(values[at + s] as number, baseline[s] as number, sensitivity[s] as number);
  }
  return sum;
};

/** Methane's log lifetime scaling from every term that no member changes, per timepoint. */
const ch4FixedTerms = (
  model: Model,
  p: MemberParams,
  emissions: Float64Array,
  concentration: Float64Array,
  steps: number,
  prior: Prior,
): Float64Array => {
  const n = model.names.length;
  const chemistry = fixedChemistry(model);
  const { baselineEmissions, baselineConcentration, ch4Chemistry } = p;
  const from = prior?.from ?? 0;
  const out = new Float64Array(steps);
  out.set((prior?.base.ch4Fixed ?? out).subarray(0, from));
  for (let t = from; t < steps; t++) {
    out[t] =
      ch4Terms(model.fromEmissions, emissions, t * n, baselineEmissions, ch4Chemistry) +
      ch4Terms(chemistry, concentration, t * n, baselineConcentration, ch4Chemistry);
  }
  return out;
};

/** Each group of minor gases' forcing above its baseline, unscaled, at every timebound. */
const minorGroupForcing = (
  model: Model,
  p: MemberParams,
  conc: Float64Array,
  steps: number,
  prior: Prior,
) => {
  const n = model.names.length;
  const groups = model.minorGroups;
  const out = new Float64Array((steps + 1) * groups.length);
  const from = prior?.from ?? 0;
  out.set((prior?.base.minorForcing ?? out).subarray(0, (from + 1) * groups.length));
  groups.forEach((group, g) =>
    group.forEach((s) => {
      const ref = p.referenceConcentration[s] as number;
      const efficiency = p.ghgEfficiency[s] as number;
      const efficacy = p.efficacy[s] as number;
      const baseline = minorForcing(p.baselineConcentration[s] as number, ref, efficiency, 1);
      for (let t = from + 1; t <= steps; t++) {
        const k = t * groups.length + g;
        const forcing = minorForcing(conc[t * n + s] as number, ref, efficiency, 1);
        out[k] = (out[k] as number) + (forcing - baseline) * efficacy;
      }
    }),
  );
  return out;
};

/** A scenario prepared before whose input this one's equals before timepoint `from`, so its
 * values up to there are copied rather than worked out again. */
type Prior = { base: PreparedScenario; from: number } | null;

const priorOf = (base: PreparedScenario | null, steps: number, from: number): Prior =>
  base && base.steps === steps && from > 0 ? { base, from } : null;

/**
 * The member-independent part of a scenario, run `steps` years from 1750. `base`, a scenario
 * prepared before, lends it the gases whose emissions it shares; when the caller knows the two
 * inputs are the same before timepoint `from`, everything before it is copied from `base`.
 */
export const prepareScenario = (
  model: Model,
  input: ScenarioInput,
  steps: number,
  base: PreparedScenario | null = null,
  from = 0,
): PreparedScenario => {
  const n = model.names.length;
  const p = model.members[0] as MemberParams;
  const prior = priorOf(base, steps, from);
  const emissions = emissionMatrix(model, input, steps, prior);
  const fixedConcentration = fixedConcentrations(model, p, emissions, steps, base, prior);
  const bounds = steps + 1;
  return {
    steps,
    emissions,
    cumulative: cumulativeMatrix(emissions, n, steps, prior),
    fixedConcentration,
    ch4Fixed: ch4FixedTerms(model, p, emissions, fixedConcentration, steps, prior),
    minorForcing: minorGroupForcing(model, p, fixedConcentration, steps, prior),
    volcanic: zeroFirst(model.natural.volcanic.slice(0, bounds)),
    solar: zeroFirst(model.natural.solar.slice(0, bounds)),
    landUse: input.landUse ? zeroFirst(atBounds(input.landUse, bounds)) : null,
  };
};
