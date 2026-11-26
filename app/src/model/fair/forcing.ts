// Concentrations and emissions to effective radiative forcing, as FaIR 2.2.5 (forcing/) does it:
// Meinshausen et al. (2020) for the greenhouse gases, the aerosol, ozone and linear forcings.

const A1 = -2.4785e-7;
const B1 = 0.00075906;
const C1 = -0.0021492;
const D1 = 5.2488;
const A2 = -0.00034197;
const B2 = 0.00025455;
const C2 = -0.00024357;
const D2 = 0.12173;
const A3 = -8.9603e-5;
const B3 = -0.00012462;
const D3 = 0.045194;

/** CO₂'s forcing per log of its concentration ratio, which saturates beyond `ca_max`. */
const co2Alpha = (co2: number, reference: number): number => {
  const max = reference - B1 / (2 * A1);
  const d = co2 - reference;
  return co2 <= reference ? D1 : co2 > max ? D1 - (B1 * B1) / (4 * A1) : D1 + A1 * d * d + B1 * d;
};

export const co2Forcing = (co2: number, n2o: number, reference: number, scale: number): number =>
  co2ForcingOfRoots(co2, Math.sqrt(n2o), reference, scale);

/** The three forcings below from square roots worked out once: the same values. */
export const co2ForcingOfRoots = (
  co2: number,
  n2oRoot: number,
  reference: number,
  scale: number,
): number => (co2Alpha(co2, reference) + C1 * n2oRoot) * Math.log(co2 / reference) * scale;

export const ch4ForcingOfRoots = (
  ch4Root: number,
  n2oRoot: number,
  referenceRoot: number,
  scale: number,
): number => (A3 * ch4Root + B3 * n2oRoot + D3) * (ch4Root - referenceRoot) * scale;

export const n2oForcingOfRoots = (
  co2Root: number,
  ch4Root: number,
  n2oRoot: number,
  referenceRoot: number,
  scale: number,
): number => (A2 * co2Root + B2 * n2oRoot + C2 * ch4Root + D2) * (n2oRoot - referenceRoot) * scale;

export const ch4Forcing = (ch4: number, n2o: number, reference: number, scale: number): number =>
  (A3 * Math.sqrt(ch4) + B3 * Math.sqrt(n2o) + D3) *
  (Math.sqrt(ch4) - Math.sqrt(reference)) *
  scale;

export const n2oForcing = (
  co2: number,
  ch4: number,
  n2o: number,
  reference: number,
  scale: number,
): number =>
  (A2 * Math.sqrt(co2) + B2 * Math.sqrt(n2o) + C2 * Math.sqrt(ch4) + D2) *
  (Math.sqrt(n2o) - Math.sqrt(reference)) *
  scale;

/** A minor greenhouse gas: radiative efficiency in W m⁻² ppb⁻¹, concentrations in ppt. */
export const minorForcing = (
  concentration: number,
  reference: number,
  efficiency: number,
  scale: number,
): number => (concentration - reference) * efficiency * 0.001 * scale;

/** `logsum`'s radiative effect of the aerosol–cloud interactions, before its baseline is taken
 * off: `sum` is Σ shape × emission (or concentration). */
export const aciEffect = (scale: number, sum: number): number => scale * Math.log(1 + sum);

/** numpy's `nansum` of a term: a NaN adds nothing. */
export const orZero = (x: number): number => (x !== x ? 0 : x);
