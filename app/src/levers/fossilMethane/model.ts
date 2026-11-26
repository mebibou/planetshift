import type { GasVector, Ssp } from '../../data/types';
import { dataValueAt, recordFrom } from '../../model/util';
import { CO2_PER_CH4, type CoChange } from '../energy/coemissions';
import type { CoSector } from '../energy/data';
import {
  FOSSIL_METHANE_LEVERS,
  hasFossilMethane,
  LEAK_GROUPS,
  LEVER_OF,
  type ByLeak,
  type FossilMethane,
} from './data';

/** The share of each group's leaked methane gone in a year. */
export type LeakCut = ByLeak;

/** Each lever's adoption reached at `share` of the ramp, times its group's avoidable share. */
export const leakCut = (
  fm: FossilMethane,
  adoption: (id: string) => number,
  share: number,
): LeakCut => recordFrom(LEAK_GROUPS, (g) => adoption(LEVER_OF[g]) * share * fm.avoidable[g]);

const leakedPerKg = (
  fm: FossilMethane,
  ssp: Ssp,
  sector: CoSector,
  year: number,
  cut: LeakCut,
): number => {
  const r = fm.perKgCo2[ssp]?.[sector];
  return r ? LEAK_GROUPS.reduce((t, g) => t + cut[g] * dataValueAt(fm.years, r[g], year), 0) : 0;
};

/**
 * kg of methane a year that a change in the sectors' fossil CO₂ no longer changes once the leaks
 * are cut: positive when the CO₂ falls, as less methane is left to avoid.
 */
export const leaksLeft = (
  fm: FossilMethane,
  ssp: Ssp,
  year: number,
  co2: Readonly<Partial<Record<CoSector, number>>>,
  cut: LeakCut,
): number =>
  -(Object.keys(co2) as CoSector[]).reduce(
    (t, s) => t + (co2[s] ?? 0) * leakedPerKg(fm, ssp, s, year, cut),
    0,
  );

/** What the leaks cut take back from a year's change in the sectors' CO₂, kg of methane. */
export type LeaksOf = (year: number, co2: Readonly<Partial<Record<CoSector, number>>>) => number;

export const NO_LEAKS: LeaksOf = () => 0;

const anyLeakCut = (adoption: (id: string) => number): boolean =>
  FOSSIL_METHANE_LEVERS.some((id) => adoption(id) > 0);

/**
 * The energy and industry levers' methane taken back by the leak levers in each year, ramped like
 * them; none without fossilmethane.json or with neither lever adopted.
 */
export const leaksOf = (
  fm: Partial<FossilMethane> | undefined,
  adoption: (id: string) => number,
  ssp: Ssp,
  shareAt: (year: number) => number,
): LeaksOf =>
  hasFossilMethane(fm) && anyLeakCut(adoption)
    ? (year, co2) => leaksLeft(fm, ssp, year, co2, leakCut(fm, adoption, shareAt(year)))
    : NO_LEAKS;

/** A year's co-emissions with the methane the leak levers take back. */
export const withLeaks = (change: CoChange, ch4: number): CoChange =>
  ch4 === 0 ? change : { ...change, ch4: change.ch4 + ch4 };

/** Change in the scenario's leaked methane in a year, kg (negative when cut). */
export const scenarioLeakChange = (
  fm: FossilMethane,
  ssp: Ssp,
  year: number,
  cut: LeakCut,
): number =>
  -LEAK_GROUPS.reduce((t, g) => t + cut[g] * dataValueAt(fm.years, fm.emissions[ssp][g], year), 0);

/**
 * The leak levers' own change each year: the scenario's leaked methane cut, with the CO₂ it would
 * have become when `oxidised` (the fossilMethaneCo2 departure).
 */
export const leakPaths = (
  fm: Partial<FossilMethane> | undefined,
  adoption: (id: string) => number,
  ssp: Ssp,
  years: readonly number[],
  shareAt: (year: number) => number,
  oxidised: boolean,
): GasVector[] =>
  years.map((y) => {
    const ch4 =
      hasFossilMethane(fm) && anyLeakCut(adoption)
        ? scenarioLeakChange(fm, ssp, y, leakCut(fm, adoption, shareAt(y)))
        : 0;
    return { co2: oxidised ? ch4 * CO2_PER_CH4 : 0, ch4, n2o: 0, hfc: 0 };
  });

/** A country's leaked methane in CEDS's year and its change at full adoption, where the file has it. */
export const countryLeaks = (
  fm: Partial<FossilMethane> | undefined,
  iso3: string,
  adoption: (id: string) => number,
): { fossilMethane: ByLeak; fossilMethaneChange: number } | null =>
  hasFossilMethane(fm) && fm.byCountry[iso3]
    ? countryChange(fm.byCountry[iso3], leakCut(fm, adoption, 1))
    : null;

const countryChange = (leaks: ByLeak, cut: LeakCut) => ({
  fossilMethane: leaks,
  fossilMethaneChange: -LEAK_GROUPS.reduce((t, g) => t + cut[g] * leaks[g], 0),
});
