import type { Ssp } from '../../data/types';
import { dataValueAt } from '../../model/util';
import type { GasCycle, HfcData } from './data';

/** The share of every HFC's emissions gone in a year: the adoption reached on the ramp. */
export const hfcCut = (file: HfcData, adoption: number, share: number): number =>
  adoption * share * file.cut;

/** An HFC's forcing, in kg of the carrier, at the end of each year of `changes` (kg a year). */
export const burden = (cycle: GasCycle, changes: readonly number[]): number[] =>
  changes.reduce<number[]>((out, e) => {
    out.push(cycle.decay * (out[out.length - 1] ?? 0) + cycle.relative * e);
    return out;
  }, []);

/**
 * The carrier's emissions, kg a year, whose forcing in FaIR follows, year by year, that of
 * `changes` (kg a year by HFC): each year's forcing less what the carrier's burden of the year
 * before keeps of it. Exact, as every HFC's cycle and forcing is linear in its emissions.
 */
export const carrierStream = (
  file: HfcData,
  changes: Readonly<Record<string, readonly number[]>>,
): number[] => {
  const length = Math.max(0, ...Object.values(changes).map((c) => c.length));
  const forcing = file.species
    .map((s) => burden(file.cycles[s] as GasCycle, changes[s] ?? new Array<number>(length).fill(0)))
    .reduce((a, b) => b.map((v, k) => v + (a[k] as number)), new Array<number>(length).fill(0));
  const carrier = file.cycles[file.carrier] as GasCycle;
  return forcing.map((f, k) => (f - carrier.decay * (forcing[k - 1] ?? 0)) / carrier.relative);
};

/** An HFC's emissions under the SSP in `years`, kg a year. */
const emissionsIn = (file: HfcData, ssp: Ssp, s: string, years: readonly number[]): number[] =>
  years.map((y) => dataValueAt(file.years, file.emissions[ssp]?.[s] ?? [], y));

/** Each HFC of the scenario cut by `cut(year)` in `years`, kg a year. */
export const hfcCuts = (
  file: HfcData,
  ssp: Ssp,
  years: readonly number[],
  cut: (year: number) => number,
): Record<string, number[]> =>
  Object.fromEntries(
    file.species.map((s) => [
      s,
      emissionsIn(file, ssp, s, years).map((e, k) => -cut(years[k] as number) * e),
    ]),
  );

/**
 * The lever's change in the HFCs each year, as kg of the carrier: the HFCs' `cuts`, less that cut
 * of the cold chain's refrigerants the food levers already removed (`food(year)`, kg of HFC-134a,
 * negative when they fall).
 */
export const hfcPath = (
  file: HfcData,
  cuts: Readonly<Record<string, readonly number[]>>,
  years: readonly number[],
  cut: (year: number) => number,
  food: (year: number) => number,
): number[] =>
  carrierStream(file, cuts).map((v, k) => {
    const y = years[k] as number;
    return v - cut(y) * food(y);
  });

/**
 * kg CO₂e a year the HFCs' `cuts` count for beyond the carrier's stream (`gwpCarrier` a kg): each
 * HFC at its own GWP100, as the forcing-equivalent stream weighs the long-lived ones by their
 * forcing so far, not over a hundred years.
 */
export const co2eGap = (
  file: HfcData,
  cuts: Readonly<Record<string, readonly number[]>>,
  gwpCarrier: number,
): number[] => {
  const stream = carrierStream(file, cuts);
  return stream.map(
    (v, k) =>
      file.species.reduce((t, s) => t + (file.gwp100[s] ?? 0) * (cuts[s]?.[k] ?? 0), 0) -
      gwpCarrier * v,
  );
};
