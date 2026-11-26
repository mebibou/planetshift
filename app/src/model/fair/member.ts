// FaIR 2.2.5's main loop (FAIR.run) for one member on a prepared scenario: the live gases
// (CO₂ and methane), every forcing, and the energy balance model. Each member's parameters are
// first compiled into flat lists of terms; the loop keeps its state in typed arrays it owns, for
// speed, and writes to nothing it is given.

import { GASBOXES, type MemberParams, type Model } from './calibration';
import { SIZE as EBM_SIZE } from './ebm';

// Read once: a module binding is a getter in some loaders (vitest's), too slow for the inner loop.
const BOXES: number = GASBOXES;
const SIZE: number = EBM_SIZE;
const {
  aciEffect,
  ch4Forcing,
  ch4ForcingOfRoots,
  co2Forcing,
  co2ForcingOfRoots,
  n2oForcing,
  n2oForcingOfRoots,
  orZero,
} = forcingModule;
const { alphaOf, ch4LogTerm, ch4TemperatureTerm, iirfOf } = gasCycleModule;
const { advanceBoxes } = scenarioModule;
import * as forcingModule from './forcing';
import * as gasCycleModule from './gasCycle';
import * as scenarioModule from './scenario';
import type { PreparedScenario } from './scenario';

/** Σ (driver[s] − baseline) × coefficient over a few species, NaN terms left out. */
export type Terms = { species: Int32Array; baseline: Float64Array; coefficient: Float64Array };

/** A forcing's efficacy and temperature feedback, which FaIR applies to every specie. */
type Weight = { efficacy: number; feedback: number };

export type Member = {
  p: MemberParams;
  n: number;
  co2: number;
  ch4: number;
  n2o: number;
  /** Greenhouse gases run per member: those not fixed (CO₂ and methane). */
  live: Int32Array;
  /** Species whose concentration the forcing reads from the prepared scenario: the fixed gases
   * and EESC that a forcing term or a greenhouse gas's forcing reads. */
  shared: Int32Array;
  /** Whether the aerosol–cloud forcing reads no concentration, so it depends on emissions only. */
  aciFixed: boolean;
  /** Σ efficacy × temperature feedback of the forcings `fixedForcing` adds up. */
  fixedFeedback: number;
  major: Record<
    'co2' | 'ch4' | 'n2o',
    { reference: number; referenceRoot: number; scale: number; offset: number } & Weight
  >;
  /** The minor greenhouse gases' scale per group of `Model.minorGroups`. */
  minorScale: Float64Array;
  ari: { emissions: Terms; concentration: Terms } & Weight;
  aci: { emissions: Terms; concentration: Terms; scale: number; baseline: number } & Weight;
  ozone: { emissions: Terms; concentration: Terms } & Weight;
  lapsi: Terms & Weight;
  h2o: Terms & Weight;
  landUse: Terms & Weight & { prescribedScale: number };
  volcanic: Weight & { scale: number };
  solar: Weight & { scale: number };
};

export const sumTerms = (terms: Terms, driver: Float64Array, at: number): number => {
  const { species, baseline, coefficient } = terms;
  let sum = 0;
  for (let k = 0; k < species.length; k++) {
    sum += orZero(
      ((driver[at + (species[k] as number)] as number) - (baseline[k] as number)) *
        (coefficient[k] as number),
    );
  }
  return sum;
};

/**
 * The terms over `species` of coefficient × scale, keeping only those that can add anything: a
 * NaN or zero coefficient adds nothing to FaIR's NaN-skipping sums.
 */
export const termsOf = (
  species: readonly number[],
  coefficient: Float64Array,
  scale: number,
  baseline: Float64Array | null,
): Terms => {
  const kept = species.filter((s) => {
    const c = coefficient[s] as number;
    return c === c && c !== 0;
  });
  return {
    species: Int32Array.from(kept),
    baseline: Float64Array.from(kept, (s) => (baseline ? (baseline[s] as number) : 0)),
    coefficient: Float64Array.from(kept, (s) => (coefficient[s] as number) * scale),
  };
};

const weightOf = (p: MemberParams, s: number): Weight => ({
  efficacy: p.efficacy[s] as number,
  feedback: p.feedback[s] as number,
});

const ALL = (n: number) => Array.from({ length: n }, (_, s) => s);

/** The aerosol–cloud effect: Σ shape × driver, NaN terms left out, through `logsum`. */
const aciSum = (aci: Member['aci'], emissions: Float64Array, at: number, conc: Float64Array) =>
  sumTerms(aci.emissions, emissions, at) + sumTerms(aci.concentration, conc, 0);

const majors = (model: Model, p: MemberParams): Member['major'] => {
  const { co2, ch4, n2o } = model.index;
  const b = (s: number) => p.baselineConcentration[s] as number;
  const of = (s: number, forcing: (ref: number, scale: number) => number) => {
    const reference = p.referenceConcentration[s] as number;
    const scale = p.scale[s] as number;
    return {
      reference,
      referenceRoot: Math.sqrt(reference),
      scale,
      offset: forcing(reference, scale),
      ...weightOf(p, s),
    };
  };
  return {
    co2: of(co2, (ref, scale) => co2Forcing(b(co2), b(n2o), ref, scale)),
    ch4: of(ch4, (ref, scale) => ch4Forcing(b(ch4), b(n2o), ref, scale)),
    n2o: of(n2o, (ref, scale) => n2oForcing(b(co2), b(ch4), b(n2o), ref, scale)),
  };
};

/** FaIR computes EESC after the aerosol forcing, so EESC's concentration is still NaN there and
 * never counts: the aerosols read the other species made from concentration. */
const aerosols = (model: Model, p: MemberParams): Pick<Member, 'ari' | 'aci'> => {
  const { fromEmissions, fromConcentration, index } = model;
  const noEesc = fromConcentration.filter((s) => s !== index.eesc);
  const ariScale = p.scale[index.ari] as number;
  const zero = new Float64Array(p.aciShape.length);
  const aciTerms = {
    emissions: termsOf(fromEmissions, p.aciShape, 1, zero),
    concentration: termsOf(noEesc, p.aciShape, 1, zero),
  };
  const baselineTerms = {
    emissions: aciTerms.emissions,
    concentration: termsOf(fromConcentration, p.aciShape, 1, zero),
  };
  return {
    ari: {
      emissions: termsOf(fromEmissions, p.ariEfficiency, ariScale, p.baselineEmissions),
      concentration: termsOf(noEesc, p.ariEfficiency, ariScale, p.baselineConcentration),
      ...weightOf(p, index.ari),
    },
    aci: {
      ...aciTerms,
      scale: p.scale[index.aci] as number,
      baseline: aciEffect(
        p.aciScale,
        aciSum(
          { ...baselineTerms, scale: 0, baseline: 0, efficacy: 0, feedback: 0 },
          p.baselineEmissions,
          0,
          p.baselineConcentration,
        ),
      ),
      ...weightOf(p, index.aci),
    },
  };
};

/** The concentrations the forcing reads that the run does not step itself. */
const sharedOf = (
  model: Model,
  live: readonly number[],
  m: Pick<Member, 'ari' | 'aci' | 'ozone' | 'h2o'>,
): Int32Array => {
  const read = [
    model.index.co2,
    model.index.ch4,
    model.index.n2o,
    ...m.ari.concentration.species,
    ...m.aci.concentration.species,
    ...m.ozone.concentration.species,
    ...m.h2o.species,
  ];
  return Int32Array.from(new Set(read.filter((s) => !live.includes(s))));
};

const feedbackOf = (...weights: Weight[]): number =>
  weights.reduce((sum, w) => sum + w.feedback * w.efficacy, 0);

export const memberOf = (model: Model, p: MemberParams): Member => {
  const compiled = compiledOf(model, p);
  const live = model.ghg.filter((s) => !model.fixed.includes(s));
  const { lapsi, landUse, volcanic, solar, aci } = compiled;
  return {
    ...compiled,
    live: Int32Array.from(live),
    shared: sharedOf(model, live, compiled),
    aciFixed: aci.concentration.species.length === 0,
    fixedFeedback: feedbackOf(lapsi, landUse, volcanic, solar),
  };
};

const compiledOf = (
  model: Model,
  p: MemberParams,
): Omit<Member, 'live' | 'shared' | 'aciFixed' | 'fixedFeedback'> => {
  const n = model.names.length;
  const { index, fromEmissions, fromConcentration } = model;
  const scaleOf = (s: number) => p.scale[s] as number;
  return {
    p,
    n,
    co2: index.co2,
    ch4: index.ch4,
    n2o: index.n2o,
    major: majors(model, p),
    minorScale: Float64Array.from(model.minorGroups, (group) => scaleOf(group[0] as number)),
    ...aerosols(model, p),
    ozone: {
      emissions: termsOf(
        fromEmissions,
        p.ozoneEfficiency,
        scaleOf(index.ozone),
        p.baselineEmissions,
      ),
      concentration: termsOf(
        fromConcentration,
        p.ozoneEfficiency,
        scaleOf(index.ozone),
        p.baselineConcentration,
      ),
      ...weightOf(p, index.ozone),
    },
    lapsi: {
      ...termsOf(ALL(n), p.lapsiEfficiency, scaleOf(index.lapsi), p.baselineEmissions),
      ...weightOf(p, index.lapsi),
    },
    h2o: {
      ...termsOf(ALL(n), p.h2oFactor, scaleOf(index.h2o), p.baselineConcentration),
      ...weightOf(p, index.h2o),
    },
    landUse: {
      ...termsOf(ALL(n), p.landUseFactor, scaleOf(index.landUse), null),
      ...weightOf(p, index.landUse),
      prescribedScale: p.prescribedScale[index.landUse] as number,
    },
    volcanic: {
      ...weightOf(p, index.volcanic),
      scale: p.prescribedScale[index.volcanic] as number,
    },
    solar: { ...weightOf(p, index.solar), scale: p.prescribedScale[index.solar] as number },
  };
};

/** A forcing with its temperature feedback, times its efficacy; NaN counts as none. */
const effective = (w: Weight, forcing: number, temperature: number): number =>
  orZero((forcing + temperature * w.feedback) * w.efficacy);

/** The lifetime scaling of a live gas at timebound t: methane's from its chemistry and the
 * temperature, the others' from their time-integrated airborne fraction. */
const liveAlpha = (
  m: Member,
  prepared: PreparedScenario,
  s: number,
  t: number,
  conc: Float64Array,
  airborne: Float64Array,
  temperature: number,
): number => {
  const { p } = m;
  return s === m.ch4
    ? Math.exp(
        (prepared.ch4Fixed[t] as number) +
          ch4LogTerm(
            conc[s] as number,
            p.baselineConcentration[s] as number,
            p.ch4Chemistry[s] as number,
          ) +
          ch4TemperatureTerm(temperature, p.ch4TemperatureSensitivity),
      )
    : alphaOf(
        iirfOf(
          p.iirf0[s] as number,
          p.iirfUptake[s] as number,
          p.iirfTemperature[s] as number,
          p.iirfAirborne[s] as number,
          prepared.cumulative[t * m.n + s] as number,
          airborne[s] as number,
          temperature,
        ),
        p.g0[s] as number,
        p.g1[s] as number,
      );
};

type Gases = {
  conc: Float64Array;
  next: Float64Array;
  boxes: Float64Array;
  airborne: Float64Array;
};

/** Timebound t to t + 1 for the gases: the live ones stepped, the shared ones read. */
const stepGases = (
  m: Member,
  model: Model,
  prepared: PreparedScenario,
  t: number,
  gases: Gases,
  temperature: number,
): void => {
  const { p, n, live, shared } = m;
  const { conc, next, boxes, airborne } = gases;
  for (let k = 0; k < live.length; k++) {
    const s = live[k] as number;
    const alpha = liveAlpha(m, prepared, s, t, conc, airborne, temperature);
    const emission = prepared.emissions[t * n + s] as number;
    airborne[s] = advanceBoxes(boxes, s * BOXES, p, s, emission, alpha);
    next[s] =
      (p.baselineConcentration[s] as number) +
      (model.concentrationPerEmission[s] as number) * (airborne[s] as number);
  }
  const at = (t + 1) * n;
  for (let k = 0; k < shared.length; k++) {
    const s = shared[k] as number;
    next[s] = prepared.fixedConcentration[at + s] as number;
  }
};

const ghgTotal = (
  m: Member,
  prepared: PreparedScenario,
  t: number,
  conc: Float64Array,
  temperature: number,
) => {
  const { co2, ch4, n2o } = m.major;
  const c = conc[m.co2] as number;
  const cRoot = Math.sqrt(c);
  const hRoot = Math.sqrt(conc[m.ch4] as number);
  const oRoot = Math.sqrt(conc[m.n2o] as number);
  const groups = m.minorScale.length;
  let minor = 0;
  for (let g = 0; g < groups; g++) {
    minor += (prepared.minorForcing[(t + 1) * groups + g] as number) * (m.minorScale[g] as number);
  }
  return (
    effective(
      co2,
      co2ForcingOfRoots(c, oRoot, co2.reference, co2.scale) - co2.offset,
      temperature,
    ) +
    effective(
      ch4,
      ch4ForcingOfRoots(hRoot, oRoot, ch4.referenceRoot, ch4.scale) - ch4.offset,
      temperature,
    ) +
    effective(
      n2o,
      n2oForcingOfRoots(cRoot, hRoot, oRoot, n2o.referenceRoot, n2o.scale) - n2o.offset,
      temperature,
    ) +
    minor
  );
};

/** Land use's forcing at timebound t + 1: prescribed, or from cumulative AFOLU CO₂. */
const landUseForcing = (m: Member, prepared: PreparedScenario, t: number): number =>
  prepared.landUse
    ? (prepared.landUse[t + 1] as number) * m.landUse.prescribedScale
    : sumTerms(m.landUse, prepared.cumulative, (t + 1) * m.n);

/**
 * The forcing at timebound t + 1 that depends on the emissions alone, none of the gases the run
 * steps: the aerosols' and ozone's from emissions, the aerosol–cloud interactions, soot on snow,
 * land use, volcanoes and the sun, each times its efficacy. Their temperature feedback is added
 * with the rest. A scenario that changes none of those emissions reuses the baseline's.
 */
export const fixedForcing = (m: Member, prepared: PreparedScenario, t: number): number => {
  const { ari, aci, ozone, lapsi, landUse, volcanic, solar } = m;
  const at = t * m.n;
  const em = prepared.emissions;
  const cloud = m.aciFixed
    ? (aciEffect(m.p.aciScale, sumTerms(aci.emissions, em, at)) - aci.baseline) * aci.scale
    : 0;
  return (
    orZero(sumTerms(ari.emissions, em, at) * ari.efficacy) +
    orZero(cloud * aci.efficacy) +
    orZero(sumTerms(ozone.emissions, em, at) * ozone.efficacy) +
    orZero(sumTerms(lapsi, em, at) * lapsi.efficacy) +
    orZero(landUseForcing(m, prepared, t) * landUse.efficacy) +
    orZero((prepared.volcanic[t + 1] as number) * volcanic.scale * volcanic.efficacy) +
    orZero((prepared.solar[t + 1] as number) * solar.scale * solar.efficacy)
  );
};

/** The rest of the short-lived forcing at timebound t + 1: the parts that read the stepped gases'
 * concentrations, and every temperature feedback. */
const liveForcing = (
  m: Member,
  prepared: PreparedScenario,
  t: number,
  conc: Float64Array,
  temperature: number,
): number => {
  const { ari, aci, ozone, h2o } = m;
  const cloud = m.aciFixed
    ? 0
    : (aciEffect(m.p.aciScale, aciSum(aci, prepared.emissions, t * m.n, conc)) - aci.baseline) *
      aci.scale;
  return (
    orZero((sumTerms(ari.concentration, conc, 0) + temperature * ari.feedback) * ari.efficacy) +
    orZero((cloud + temperature * aci.feedback) * aci.efficacy) +
    orZero(
      (sumTerms(ozone.concentration, conc, 0) + temperature * ozone.feedback) * ozone.efficacy,
    ) +
    orZero((sumTerms(h2o, conc, 0) + temperature * h2o.feedback) * h2o.efficacy) +
    temperature * m.fixedFeedback
  );
};

/** `step_temperature`: the energy balance model's state a year on, into `state` from `old`. */
const stepTemperature = (
  state: Float64Array,
  old: Float64Array,
  m: Member,
  forcing: number,
  noise: Float64Array | null,
  at: number,
): void => {
  const { matrix: a, vector: v } = m.p.ebm;
  const x0 = old[0] as number;
  const x1 = old[1] as number;
  const x2 = old[2] as number;
  const x3 = old[3] as number;
  for (let r = 0; r < SIZE; r++) {
    const k = r * SIZE;
    state[r] =
      (a[k] as number) * x0 +
      (a[k + 1] as number) * x1 +
      (a[k + 2] as number) * x2 +
      (a[k + 3] as number) * x3 +
      (v[r] as number) * forcing +
      (noise ? (noise[at + r] as number) : 0);
  }
};

/** Where a member's run stands at timebound `t`: enough to carry it on from there. */
export type MemberState = {
  t: number;
  conc: Float64Array;
  boxes: Float64Array;
  airborne: Float64Array;
  ebm: Float64Array;
};

/** The state before the first year: every gas at its baseline, no warming. */
export const initialState = (m: Member): MemberState => ({
  t: 0,
  conc: Float64Array.from(m.p.baselineConcentration),
  boxes: new Float64Array(m.n * BOXES),
  airborne: new Float64Array(m.n),
  ebm: new Float64Array(SIZE),
});

export type MemberRun = {
  /** Surface temperature (K above the start) at each timebound from the state run from; NaN
   * before it. */
  temperature: Float64Array;
  /** CO₂'s concentration (ppm) at the same timebounds. */
  co2: Float64Array;
  /** The state at `until`. */
  state: MemberState;
};

/**
 * One member's run on a prepared scenario from `from` (the start by default) to timebound
 * `until` (the end by default). `noise` is FaIR's internal variability for the member,
 * [timebound × 4] as its `stochastic_d`; without it the run is FaIR's with `stochastic_run` off.
 * A run carried on from a state is the same, to the last bit, as one run in one go.
 */
/** Each timepoint's `fixedForcing`: filled by a run, or `known` to it from a run on the same
 * emissions of every specie it reads. */
export type FixedForcing = { values: Float64Array; known: boolean };

const fixedAt = (
  m: Member,
  prepared: PreparedScenario,
  t: number,
  fixed: FixedForcing | null,
): number => {
  const value = fixed?.known ? (fixed.values[t] as number) : fixedForcing(m, prepared, t);
  if (fixed && !fixed.known) {
    fixed.values[t] = value;
  }
  return value;
};

export const runMember = (
  model: Model,
  m: Member,
  prepared: PreparedScenario,
  noise: Float64Array | null = null,
  from: MemberState = initialState(m),
  until: number = prepared.steps,
  fixed: FixedForcing | null = null,
): MemberRun => {
  const gases: Gases = {
    conc: Float64Array.from(from.conc),
    next: Float64Array.from(from.conc),
    boxes: Float64Array.from(from.boxes),
    airborne: Float64Array.from(from.airborne),
  };
  let state = Float64Array.from(from.ebm);
  let old = new Float64Array(SIZE);
  const out = new Float64Array(prepared.steps + 1).fill(NaN);
  const co2 = new Float64Array(prepared.steps + 1).fill(NaN);
  out[from.t] = state[1] as number;
  co2[from.t] = from.conc[m.co2] as number;
  for (let t = from.t; t < until; t++) {
    const temperature = state[1] as number;
    stepGases(m, model, prepared, t, gases, temperature);
    const forcing =
      ghgTotal(m, prepared, t, gases.next, temperature) +
      liveForcing(m, prepared, t, gases.next, temperature) +
      fixedAt(m, prepared, t, fixed);
    const swap = old;
    old = state;
    state = swap;
    stepTemperature(state, old, m, forcing, noise, (t + 1) * SIZE);
    out[t + 1] = state[1] as number;
    co2[t + 1] = gases.next[m.co2] as number;
    const before = gases.conc;
    gases.conc = gases.next;
    gases.next = before;
  }
  const { conc, boxes, airborne } = gases;
  return { temperature: out, co2, state: { t: until, conc, boxes, airborne, ebm: state } };
};
