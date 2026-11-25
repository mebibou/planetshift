import {
  GASES,
  type CauseWarming,
  type Climate,
  type ClimateMethod,
  type FarmGas,
  type Gas,
  type GasVector,
  type Ssp,
} from '../../data/types';
import { agtpOf, convolve, sumOfGases, warmingByGas, type Band } from '../../model/climate';
import { addSeries, dataValueAt, END_YEAR, range, valueAt, zerosOn } from '../../model/util';
import type { CoEmissions, RangeSeries } from '../energy/data';
import type { PeopleData, PeopleSpecies, PopulationData, PopulationVariant } from './data';

/**
 * People on Earth, a thought experiment: the world's population goes in a straight line from
 * today's to a number of people in PEOPLE_YEAR and holds it after, and every human emission
 * follows it.
 */

export const PEOPLE_YEAR = 2050;
export const BILLION = 1e9;

/** The UN variant's world population in `year`, people; NaN without it. */
export const variantPeople = (
  pop: PopulationData,
  variant: PopulationVariant,
  year: number = PEOPLE_YEAR,
): number => {
  const s = pop.world[variant];
  return s.years.length > 0 ? valueAt(s.years, s.values, year) : NaN;
};

/** The world's population by year, `from`..END_YEAR: the estimates, then the medium projection. */
export const worldMedium = (pop: PopulationData, from: number): Record<number, number> => {
  const { history, medium } = pop.world;
  const years = [...history.years, ...medium.years];
  const values = [...history.values, ...medium.values];
  return Object.fromEntries(range(from, END_YEAR).map((y) => [y, valueAt(years, values, y)]));
};

/**
 * World population by year from the first year of `medium` to END_YEAR: the countries' own up to
 * the current year, then a straight line to `target` people in `year`, held after.
 */
export const peoplePath = (
  medium: Readonly<Record<number, number>>,
  target: number,
  currentYear: number,
  year: number = PEOPLE_YEAR,
): Record<number, number> => {
  const years = Object.keys(medium).map(Number);
  const first = Math.min(...years);
  const start = medium[currentYear] ?? target;
  const span = Math.max(1, year - currentYear);
  const at = (y: number): number =>
    y <= currentYear
      ? (medium[y] ?? start)
      : start + (target - start) * Math.min(1, (y - currentYear) / span);
  return Object.fromEntries(range(first, END_YEAR).map((y) => [y, at(y)]));
};

/**
 * The SSP's own population by year, `from`..END_YEAR, scaled to the path's in the current year;
 * null without it.
 */
export const sspPopulation = (
  people: PeopleData,
  ssp: Ssp,
  from: number,
  currentYear: number,
  path: Readonly<Record<number, number>>,
): Record<number, number> | null =>
  scaledTo(people.years, people.population?.[ssp] ?? [], from, currentYear, path[currentYear] ?? 0);

const scaledTo = (
  years: readonly number[],
  values: readonly number[],
  from: number,
  year: number,
  count: number,
): Record<number, number> | null => {
  const now = values.length > 0 ? valueAt(years, values, year) : 0;
  return now > 0 && count > 0
    ? Object.fromEntries(
        range(from, END_YEAR).map((y) => [y, (valueAt(years, values, y) * count) / now]),
      )
    : null;
};

/** The people chosen over a reference population in a year: 1 up to the current year. */
export const peopleFactor =
  (
    medium: Readonly<Record<number, number>>,
    path: Readonly<Record<number, number>>,
    currentYear: number,
  ) =>
  (year: number): number => {
    const m = medium[year] ?? 0;
    return year <= currentYear || m <= 0 ? 1 : (path[year] ?? m) / m;
  };

export interface PeopleContext {
  people: PeopleData;
  climate: Climate;
  co: Partial<CoEmissions> | undefined;
  /** °C per W/m² held a year, by horizon. */
  response: readonly number[];
  ssp: Ssp;
  method: ClimateMethod;
  band: Band;
  currentYear: number;
  factor: (year: number) => number;
}

/** Whether people.json has the SSP's emissions. */
export const hasPeople = (people: PeopleData | undefined, ssp: Ssp): boolean =>
  (people?.years.length ?? 0) > 0 && people?.bySsp[ssp] !== undefined;

const speciesAt = (ctx: PeopleContext, s: PeopleSpecies, year: number): number => {
  const own = ctx.people.bySsp[ctx.ssp]?.[s] ?? [];
  return own.length > 0 ? dataValueAt(ctx.people.years, own, year) : 0;
};

/** kg a year of a species the people chosen take away (negative) or add, from the current year. */
const changeOf = (ctx: PeopleContext, years: readonly number[], s: PeopleSpecies): number[] =>
  years.map((y) => (ctx.factor(y) - 1) * speciesAt(ctx, s, y));

/** The greenhouse causes outside farming the people's emissions are split between. */
const OUTSIDE_FARMING = ['fossilIndustry', 'landUse', 'waste', 'other'] as const;
type OutsideFarming = (typeof OUTSIDE_FARMING)[number];
type SplitCause = Exclude<OutsideFarming, 'other'>;

/** kg a year of a gas from fossil fuels and industry, land use or waste; none without the split. */
const causeAt = (ctx: PeopleContext, cause: SplitCause, g: Gas, y: number) => {
  const own = ctx.people.bySsp[ctx.ssp]?.byCause?.[cause]?.[g] ?? [];
  return own.length > 0 ? dataValueAt(ctx.people.years, own, y) : 0;
};

/** kg a year of each gas outside farming, by cause: the SSP's, the rest of it `other`. */
const outsideFarming = (
  ctx: PeopleContext,
  g: FarmGas,
  y: number,
): Record<OutsideFarming, number> => {
  const farm = ctx.climate.agricultureEmissions[ctx.ssp][g];
  const fossilIndustry = causeAt(ctx, 'fossilIndustry', g, y);
  const landUse = causeAt(ctx, 'landUse', g, y);
  const waste = causeAt(ctx, 'waste', g, y);
  const own = speciesAt(ctx, g, y) - valueAt(farm.years, farm.values, y);
  return { fossilIndustry, landUse, waste, other: own - fossilIndustry - landUse - waste };
};

/**
 * The change in greenhouse gases outside farming, which the population baseline already scales
 * with the people chosen, by cause: every human source but agriculture.
 */
const otherGases = (ctx: PeopleContext, years: readonly number[]) =>
  Object.fromEntries(
    OUTSIDE_FARMING.map((c) => [
      c,
      years.map(
        (y) =>
          Object.fromEntries(
            GASES.map((g) => [
              g,
              g === 'hfc' ? 0 : (ctx.factor(y) - 1) * outsideFarming(ctx, g, y)[c],
            ]),
          ) as GasVector,
      ),
    ]),
  ) as Record<OutsideFarming, GasVector[]>;

/** A range's end in a year times `kg`, the one that moves the result its band's way: p95 the warmest. */
const endFor = (
  years: readonly number[],
  r: { median: number[]; low: number[]; high: number[] },
  band: Band,
  year: number,
  kg: number,
): number => {
  const at = (s: number[]) => dataValueAt(years, s, year) * kg;
  const [low, high] = [at(r.low), at(r.high)];
  return band === 'median'
    ? at(r.median)
    : band === 'p95'
      ? Math.max(low, high)
      : Math.min(low, high);
};

/**
 * W/m² by year from the change in air pollution: the people chosen over the medium projection,
 * less one, times the forcing of all of it, so that none left takes all of it away.
 */
const pollutionForcing = (ctx: PeopleContext, years: readonly number[]): number[] => {
  const erf = ctx.people.bySsp[ctx.ssp]?.erf;
  return years.map((y) =>
    erf ? endFor(ctx.people.years, erf, ctx.band, y, ctx.factor(y) - 1) : 0,
  );
};

/** kg of methane a change in a pollutant leaves in the air, by year; none without its series. */
const methaneOf = (
  ctx: PeopleContext,
  co: CoEmissions,
  perKg: RangeSeries | undefined,
  change: readonly number[],
  years: readonly number[],
): number[] =>
  years.map((y, i) => (perKg ? endFor(co.years, perKg, ctx.band, y, change[i] ?? 0) : 0));

/**
 * kg of methane NOx, VOCs and CO leave in the air: more as NOx falls, less as VOCs and CO do. CO
 * counts only when the coMethane departure splits its methane from the VOCs'.
 */
const pollutionMethane = (ctx: PeopleContext, co: CoEmissions, years: readonly number[]) => {
  const parts = (['nox', 'voc', 'co'] as const).map((s) =>
    methaneOf(ctx, co, METHANE_PER_KG[s](co)?.[ctx.ssp], changeOf(ctx, years, s), years),
  );
  return years.map((_, i) => -parts.reduce((total, p) => total + (p[i] as number), 0));
};

const METHANE_PER_KG = {
  nox: (co: CoEmissions) => co.noxCh4PerKg,
  voc: (co: CoEmissions) => co.vocCh4PerKg,
  co: (co: CoEmissions) => co.coCh4PerKg,
};

/** Warming from the methane the NOx and VOCs the people chosen take away or add leave. */
const pollutionMethaneWarming = (
  ctx: PeopleContext,
  years: readonly number[],
  tYears: readonly number[],
): number[] => {
  const co = ctx.co;
  return co?.noxCh4PerKg?.[ctx.ssp]
    ? convolve(
        pollutionMethane(ctx, co as CoEmissions, years),
        ctx.currentYear,
        agtpOf(ctx.climate, ctx.method, 'ch4', ctx.band),
        tYears,
      )
    : zerosOn(tYears);
};

/** Warming from the forcing of the air pollution the people chosen take away or add. */
const pollutionForcingWarming = (
  ctx: PeopleContext,
  years: readonly number[],
  tYears: readonly number[],
): number[] =>
  ctx.response.length > 0
    ? convolve(pollutionForcing(ctx, years), ctx.currentYear, ctx.response, tYears)
    : zerosOn(tYears);

/**
 * Warming the people chosen add to the SSP's (negative with fewer people), °C on `tYears`, by
 * cause of warming and each gas's by cause: the greenhouse gases outside farming through their
 * AGTP, the air pollution of every source through its forcing and the methane its NOx and VOCs
 * leave, which the gases count with their other sources. A sum of pulse responses, linear in the
 * emissions.
 */
export const peopleWarmingByCause = (
  ctx: PeopleContext,
  tYears: readonly number[],
): CauseWarming => {
  const years = range(ctx.currentYear, END_YEAR);
  const gases = otherGases(ctx, years);
  const byGas = Object.fromEntries(
    OUTSIDE_FARMING.map((c) => [
      c,
      warmingByGas(gases[c], ctx.currentYear, ctx.climate, ctx.method, ctx.band, tYears),
    ]),
  ) as Record<OutsideFarming, Record<Gas, number[]>>;
  const methane = pollutionMethaneWarming(ctx, years, tYears);
  return {
    byCause: {
      fossilIndustry: sumOfGases(byGas.fossilIndustry),
      landUse: sumOfGases(byGas.landUse),
      waste: sumOfGases(byGas.waste),
      other: sumOfGases(byGas.other),
      airPollution: addSeries(pollutionForcingWarming(ctx, years, tYears), methane),
    },
    byGas: Object.fromEntries(
      GASES.map((g) => [
        g,
        {
          fossilIndustry: byGas.fossilIndustry[g],
          landUse: byGas.landUse[g],
          waste: byGas.waste[g],
          other: g === 'ch4' ? addSeries(byGas.other[g], methane) : byGas.other[g],
        },
      ]),
    ),
  };
};
