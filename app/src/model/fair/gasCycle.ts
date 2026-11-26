// FaIR 2.2.5's gas cycle (gas_cycle/): the lifetime scaling of each greenhouse gas from its
// time-integrated airborne fraction (Leach et al. 2021), methane's from its chemistry and the
// temperature (Thornhill et al. 2021), and the step of each gas box.

/** FaIR's defaults, which climate_fair keeps. */
export const IIRF_MAX = 100;
export const CH4_MIN = 0.01;
const LOG_CH4_MIN = Math.log(CH4_MIN);
export const BR_CL_RATIO = 45;

/** numpy's `fmax`: the larger, a NaN losing to a number. */
export const fmax = (a: number, b: number): number => (a !== a ? b : b !== b ? a : Math.max(a, b));

/** FaIR's clamp of the airborne fraction: written as it is, so NaN stays NaN and iirf_max itself
 * gives 0. */
export const clampIirf = (iirf: number, max: number): number =>
  (iirf > max ? max : 0) + iirf * Number(iirf < max);

/** The time-integrated airborne fraction of a gas at its present burden and temperature. */
export const iirfOf = (
  iirf0: number,
  uptake: number,
  temperatureSensitivity: number,
  airborneSensitivity: number,
  cumulative: number,
  airborne: number,
  temperature: number,
): number =>
  iirf0 +
  uptake * (cumulative - airborne) +
  temperatureSensitivity * temperature +
  airborneSensitivity * airborne;

/** `calculate_alpha`: the scaling of a gas's lifetimes, 1 where it comes out undefined. */
export const alphaOf = (iirf: number, g0: number, g1: number): number => {
  const alpha = g0 * Math.exp(clampIirf(iirf, IIRF_MAX) / g1);
  return alpha !== alpha ? 1 : alpha;
};

/** One specie's term of methane's log lifetime scaling: its change from the baseline times its
 * sensitivity, floored at log(CH4_MIN). */
export const ch4LogTerm = (value: number, baseline: number, sensitivity: number): number =>
  fmax(Math.log(1 + (value - baseline) * sensitivity), LOG_CH4_MIN);

/** The temperature's term, as FaIR 2.2.5 writes it: the floor compared before the log, so it
 * never bites. */
export const ch4TemperatureTerm = (temperature: number, sensitivity: number): number =>
  Math.log(fmax(1 + temperature * sensitivity, LOG_CH4_MIN));

/**
 * `step_concentration` for one gas box: the box decays over the year and takes in its share of the
 * emissions above the baseline, integrated over the year as (1 − e^−r)/r, with the 1 − exp form
 * of FaIR 2.2.5 rather than expm1.
 */
export const stepBox = (
  box: number,
  emission: number,
  baselineEmission: number,
  partition: number,
  lifetime: number,
  alpha: number,
): number => {
  const rate = 1 / (alpha * lifetime);
  const decay = Math.exp(-rate);
  return ((partition * (emission - baselineEmission) * 1) / rate) * (1 - decay) * 1 + box * decay;
};

/** One halogen's equivalent effective stratospheric chlorine (`calculate_eesc`), summed by the
 * caller. */
export const eescTerm = (
  concentration: number,
  clAtoms: number,
  brAtoms: number,
  release: number,
  cfc11Release: number,
): number =>
  ((clAtoms * concentration * release) / cfc11Release +
    (BR_CL_RATIO * brAtoms * concentration * release) / cfc11Release) *
  cfc11Release;
