import {
  GASES,
  type CauseWarming,
  type Climate,
  type ClimateMethod,
  type Gas,
  type GasVector,
  type Ssp,
} from '../data/types';
import { addSeries, END_YEAR, range, sum, valueAt, zerosOn } from './util';

export type Band = 'median' | 'p05' | 'p95';
export const BANDS: readonly Band[] = ['median', 'p05', 'p95'];

/** The AGTP curve of a gas for a band; a method without a range uses its median for all three. */
export const agtpOf = (climate: Climate, method: ClimateMethod, gas: Gas, band: Band): number[] => {
  const curves = climate.agtp[method][gas];
  return curves[band].length > 0 ? curves[band] : curves.median;
};

/** ΔT `h` years after the series starts: each earlier year's emission times its AGTP. */
const convolveAt = (
  emissions: readonly number[],
  h: number,
  agtp: readonly number[],
  last: number,
): number => {
  // Emissions after t (h < 0) add nothing: stop there, adding in the same order.
  const end = Math.min(emissions.length, h + 1);
  let acc = 0;
  for (let k = 0; k < end; k++) {
    const e = emissions[k] as number;
    if (e !== 0) {
      acc += e * (agtp[Math.min(h - k, last)] as number);
    }
  }
  return acc;
};

/**
 * Temperature response to an emission series: ΔT(t) = Σ_τ≤t E(τ)·AGTP(t−τ), with E[k] the
 * emission in startYear + k and AGTP held at its last value beyond its horizon.
 */
export const convolve = (
  emissions: readonly number[],
  startYear: number,
  agtp: readonly number[],
  years: readonly number[],
): number[] => {
  const last = agtp.length - 1;
  return years.map((t) =>
    last < 0 || t < startYear ? 0 : convolveAt(emissions, t - startYear, agtp, last),
  );
};

/** Each gas's convolution. */
export const warmingByGas = (
  emissions: readonly GasVector[],
  startYear: number,
  climate: Climate,
  method: ClimateMethod,
  band: Band,
  years: readonly number[],
): Record<Gas, number[]> =>
  Object.fromEntries(
    GASES.map((gas) => [
      gas,
      convolve(
        emissions.map((e) => e[gas]),
        startYear,
        agtpOf(climate, method, gas, band),
        years,
      ),
    ]),
  ) as Record<Gas, number[]>;

/** Sum over gases of each gas's warming, from `warmingByGas`. */
export const sumOfGases = (byGas: Readonly<Record<Gas, readonly number[]>>): number[] =>
  byGas.co2.map((_, i) => sum(GASES.map((gas) => byGas[gas][i] as number)));

/** Sum over gases of each gas's convolution. */
export const warmingFrom = (
  emissions: readonly GasVector[],
  startYear: number,
  climate: Climate,
  method: ClimateMethod,
  band: Band,
  years: readonly number[],
): number[] => sumOfGases(warmingByGas(emissions, startYear, climate, method, band, years));

/**
 * Emissions the 'population' baseline adds to the SSP's own agricultural path from the base
 * year: PRIMAP's base-year agricultural emissions scaled by population, minus the SSP's.
 */
export const populationAdjustmentEmissions = (
  climate: Climate,
  ssp: Ssp,
  baseYear: number,
  populationRatio: (year: number) => number,
): GasVector[] =>
  range(baseYear, END_YEAR).map(
    (y) =>
      Object.fromEntries(
        GASES.map((gas) => {
          const { years, values } = climate.agricultureEmissions[ssp][gas];
          return [
            gas,
            valueAt(years, values, baseYear) * populationRatio(y) - valueAt(years, values, y),
          ];
        }),
      ) as GasVector,
  );

/** The sum of warming by cause. */
export const totalWarming = (w: CauseWarming, tYears: readonly number[]): number[] =>
  Object.values(w.byCause).reduce<number[]>((acc, s) => addSeries(acc, s), zerosOn(tYears));
