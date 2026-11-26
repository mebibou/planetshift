import type { BandSeries, Climate, Ssp } from '../data/types';
import { convolve } from './climate';
import { cachedIn } from './util';
import type { SeaLevelPaths } from './seaLevel';

/**
 * Surface seawater, held fixed: salinity 35 and total alkalinity 2300 µmol/kg (Jiang et al.
 * 2019's global mean). At fixed alkalinity, 1.5 °C of warming moves pH by under 0.003, so the
 * temperature is fixed too.
 */
export const SEAWATER = { salinity: 35, alkalinity: 2300e-6, celsius: 18 } as const;

const K = 273.15;

interface Constants {
  k0: number;
  k1: number;
  k2: number;
  kb: number;
  kw: number;
  boron: number;
}

/** The equilibrium constants on the total scale, mol/kg (K0 in mol/kg/atm). */
export const constants = (celsius: number, s: number): Constants => {
  const t = celsius + K;
  const t100 = t / 100;
  const sq = Math.sqrt(s);
  return {
    // Weiss (1974).
    k0: Math.exp(
      -60.2409 +
        93.4517 / t100 +
        23.3585 * Math.log(t100) +
        s * (0.023517 - 0.023656 * t100 + 0.0047036 * t100 ** 2),
    ),
    // Lueker et al. (2000).
    k1: 10 ** -(3633.86 / t - 61.2172 + 9.6777 * Math.log(t) - 0.011555 * s + 0.0001152 * s ** 2),
    k2: 10 ** -(471.78 / t + 25.929 - 3.16967 * Math.log(t) - 0.01781 * s + 0.0001122 * s ** 2),
    // Dickson (1990).
    kb: Math.exp(
      (-8966.9 - 2890.53 * sq - 77.942 * s + 1.728 * s ** 1.5 - 0.0996 * s ** 2) / t +
        148.0248 +
        137.1942 * sq +
        1.62142 * s -
        (24.4344 + 25.085 * sq + 0.2474 * s) * Math.log(t) +
        0.053105 * sq * t,
    ),
    // Millero (1995).
    kw: Math.exp(
      148.9802 -
        13847.26 / t -
        23.6521 * Math.log(t) +
        (-5.977 + 118.67 / t + 1.0495 * Math.log(t)) * sq -
        0.01615 * s,
    ),
    // Lee et al. (2010).
    boron: (432.6e-6 * s) / 35,
  };
};

/**
 * The fugacity of CO₂ over seawater, atm, from its dry-air mole fraction in ppm: less the water
 * vapour (Weiss and Price 1980), and the virial correction (Weiss 1974) at 1 atm.
 */
export const fugacity = (ppm: number, celsius: number, s: number): number => {
  const t = celsius + K;
  const vapour = Math.exp(
    24.4543 - 67.4509 * (100 / t) - 4.8489 * Math.log(t / 100) - 0.000544 * s,
  );
  const b = -1636.75 + 12.0408 * t - 3.27957e-2 * t ** 2 + 3.16528e-5 * t ** 3;
  const delta = 57.7 - 0.118 * t;
  const virial = Math.exp(((b + 2 * delta) * 1e-6 * 101325) / (8.314 * t));
  return ppm * 1e-6 * (1 - vapour) * virial;
};

/** Total alkalinity at a hydrogen ion concentration, mol/kg: carbonate, borate and water. */
const alkalinityAt = (h: number, co2: number, c: Constants): number =>
  (c.k1 * co2) / h +
  (2 * c.k1 * c.k2 * co2) / h ** 2 +
  (c.boron * c.kb) / (c.kb + h) +
  c.kw / h -
  h;

/** The solver's inputs for a seawater: its constants and the dissolved CO₂ per ppm in the air. */
const prepared = (sea: typeof SEAWATER) => {
  const c = constants(sea.celsius, sea.salinity);
  return { c, perPpm: c.k0 * fugacity(1, sea.celsius, sea.salinity), alkalinity: sea.alkalinity };
};

const FIXED = prepared(SEAWATER);

/** pH on the total scale of surface seawater in equilibrium with `ppm` of CO₂ in the air. */
export const ph = (ppm: number, sea = SEAWATER): number => {
  const { c, perPpm, alkalinity } = sea === SEAWATER ? FIXED : prepared(sea);
  const co2 = perPpm * ppm;
  // Bisection on log10(H) over pH 6–10: alkalinity falls as H rises; 32 steps pin pH to 1e-9.
  const solve = (lo: number, hi: number, n: number): number => {
    const mid = (lo + hi) / 2;
    return n === 0
      ? mid
      : alkalinityAt(10 ** -mid, co2, c) > alkalinity
        ? solve(lo, mid, n - 1)
        : solve(mid, hi, n - 1);
  };
  return solve(6, 10, 32);
};

/**
 * The surface ocean's pH each year without and with the levers: FaIR's CO₂ of the scenario, and
 * that CO₂ changed by the run's CO₂ emissions (`co2Change`, kg a year from `startYear`) through
 * FaIR's ppm per kg. Each band end takes the CO₂ band's other end, as more CO₂ means lower pH.
 */
export const oceanPaths = (
  climate: Climate,
  ssp: Ssp,
  co2Change: readonly number[],
  startYear: number,
): SeaLevelPaths | undefined => {
  const base = climate.co2?.[ssp];
  const response = climate.co2PpmPerKg?.median;
  return base && response
    ? pathsOf(base, convolve(co2Change, startYear, response, base.years))
    : undefined;
};

type PhBand = SeaLevelPaths['baseline'];

/**
 * The surface ocean's pH each year from FaIR's CO₂ run in the model, without and with the levers:
 * each band end takes the CO₂ band's other end, as more CO₂ means lower pH.
 */
export const oceanFromCo2 = (base: BandSeries, scenario: BandSeries): SeaLevelPaths => {
  const baseline = baselineOf(base);
  // Solved again only where the CO₂ differs from the baseline's.
  const of = (ppm: readonly number[], same: readonly number[], solved: readonly number[]) =>
    ppm.map((p, i) => (p === same[i] ? (solved[i] as number) : ph(p)));
  return {
    years: base.years,
    baseline,
    scenario: {
      median: of(scenario.median, base.median, baseline.median),
      low: of(scenario.p95, base.p95, baseline.low),
      high: of(scenario.p05, base.p05, baseline.high),
    },
  };
};

const phOf = (ppm: readonly number[]) => ppm.map((p) => ph(p));

/** The pH without the levers, the same for every run on a dataset. */
const baselineCache = new WeakMap<BandSeries, PhBand>();
const baselineOf = (base: BandSeries): PhBand =>
  cachedIn(baselineCache, base, () => ({
    median: phOf(base.median),
    low: phOf(base.p95),
    high: phOf(base.p05),
  }));

/** The pH with the levers: the baseline's where nothing changes, solved again elsewhere. */
const pathsOf = (base: BandSeries, change: readonly number[]): SeaLevelPaths => {
  const baseline = baselineOf(base);
  const shifted = (ppm: readonly number[], same: readonly number[]) =>
    ppm.map((p, i) => (change[i] ? ph(p + (change[i] as number)) : (same[i] as number)));
  return {
    years: base.years,
    baseline,
    scenario: {
      median: shifted(base.median, baseline.median),
      low: shifted(base.p95, baseline.low),
      high: shifted(base.p05, baseline.high),
    },
  };
};
