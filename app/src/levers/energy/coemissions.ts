import type { Climate, ClimateMethod, GasVector, Range3, Ssp } from '../../data/types';
import { towards } from '../../model/bands';
import { agtpOf, convolve, type Band } from '../../model/climate';
import { dataValueAt, recordFrom } from '../../model/util';
import {
  CO_SPECIES,
  type CoEmissions,
  type CoSector,
  type CoSpecies,
  type NoxMethane,
  type RangeSeries,
} from './data';

/** kg a year of each co-emitted species (negative when avoided). */
export type CoChange = Record<CoSpecies, number>;

export const NO_CO_CHANGE: CoChange = Object.fromEntries(CO_SPECIES.map((s) => [s, 0])) as CoChange;

/** Whether coemissions.json was loaded with data for the levers to act on. */
export const hasCoEmissions = (co: Partial<CoEmissions> | undefined): co is CoEmissions =>
  co?.perKgCo2 !== undefined && Object.keys(co.perKgCo2).length > 0;

/** Sectors that keep their NOx when a lever cuts their CO₂, as the clean fuel is still burnt. */
export type KeepsNox = readonly CoSector[];

/**
 * What changes in fossil CO₂ by sector bring with them in a year, kg a year by species: each
 * sector's kg per kg of CO₂ that year, but for the NOx it keeps. Nothing without
 * coemissions.json.
 */
export const coChange = (
  co: Partial<CoEmissions> | undefined,
  ssp: Ssp,
  year: number,
  co2: Readonly<Partial<Record<CoSector, number>>>,
  keepsNox: KeepsNox = [],
): CoChange => (hasCoEmissions(co) ? coChangeOf(co, ssp, year, co2, keepsNox) : NO_CO_CHANGE);

const coChangeOf = (
  co: CoEmissions,
  ssp: Ssp,
  year: number,
  co2: Readonly<Partial<Record<CoSector, number>>>,
  keepsNox: KeepsNox,
): CoChange => {
  const ratios = co.perKgCo2[ssp];
  const sectors = (Object.keys(co2) as CoSector[]).filter((s) => co2[s] !== 0 && ratios[s]);
  return recordFrom(CO_SPECIES, (species) => {
    let total = 0;
    for (const s of sectors) {
      if (species !== 'nox' || !keepsNox.includes(s)) {
        total += (co2[s] as number) * dataValueAt(co.years, ratios[s][species], year);
      }
    }
    return total;
  });
};

/**
 * The greenhouse gases of each year's change: the levers' fossil CO₂ with the CO₂ of producing the
 * fuel, and the methane and N₂O that come with it.
 */
export const coGases = (co2: readonly number[], co: readonly CoYear[]): GasVector[] =>
  co2.map((v, i) => {
    const change = (co[i] as CoYear).change;
    return { co2: v + change.co2, ch4: change.ch4, n2o: change.n2o, hfc: 0 };
  });

const rangeAt = (co: CoEmissions, r: RangeSeries, year: number): Range3 => ({
  median: dataValueAt(co.years, r.median, year),
  low: dataValueAt(co.years, r.low, year),
  high: dataValueAt(co.years, r.high, year),
});

/** A year's changes: fossil CO₂ by sector, and what comes with it. */
export interface CoYear {
  co2: Readonly<Partial<Record<CoSector, number>>>;
  change: CoChange;
  /** Sectors whose NOx stays as their CO₂ goes. */
  keepsNox?: KeepsNox;
}

/** Σ over sectors of a per-kg-of-CO₂ range times the sector's change, each band's end its way. */
const bySector = (
  co: CoEmissions,
  perKg: Partial<Record<CoSector, RangeSeries>> | undefined,
  band: Band,
  year: number,
  co2: Readonly<Partial<Record<CoSector, number>>>,
  more: (v: number) => boolean,
): number =>
  (Object.keys(co2) as CoSector[])
    .filter((s) => co2[s] !== 0 && perKg?.[s])
    .reduce((total, s) => {
      const v = co2[s] as number;
      return total + towards(rangeAt(co, perKg?.[s] as RangeSeries, year), band, more(v)) * v;
    }, 0);

/**
 * Change in forcing from a change in air pollution in a year, W/m²: the forcing per kg of each
 * sector's CO₂ of its particles (sulphate, organic carbon and ammonia's nitrate cool, black
 * carbon warms) and of the ozone its carbon monoxide and VOCs make, and NOx's own (its ozone,
 * less its nitrate). Fewer cooling particles warm. Each band takes the end of each range that
 * moves the warming avoided its way.
 */
export const airPollutionForcing = (
  co: Partial<CoEmissions> | undefined,
  ssp: Ssp,
  band: Band,
  year: number,
  changes: CoYear,
): number => (hasCoEmissions(co) ? forcingOf(co, ssp, band, year, changes) : 0);

const forcingOf = (
  co: CoEmissions,
  ssp: Ssp,
  band: Band,
  year: number,
  { co2, change }: CoYear,
): number => {
  const nox =
    change.nox === 0
      ? 0
      : towards(rangeAt(co, co.erfPerKg[ssp].nox, year), band, change.nox < 0) * change.nox;
  const fuel = (perKg?: Partial<Record<CoSector, RangeSeries>>) =>
    bySector(co, perKg, band, year, co2, (v) => v < 0);
  return nox + fuel(co.particleErfPerKgCo2[ssp]) + fuel(co.ozoneErfPerKgCo2?.[ssp]);
};

/**
 * kg of methane a change in VOCs leaves in the air in a year, less as they fall (they lengthen
 * methane's lifetime): each sector's change in CO₂ times its methane per kg of CO₂ through its
 * VOCs, one coefficient everywhere.
 */
export const vocMethane = (
  co: Partial<CoEmissions> | undefined,
  ssp: Ssp,
  band: Band,
  year: number,
  { co2 }: CoYear,
): number =>
  hasCoEmissions(co) ? -bySector(co, co.vocCh4PerKgCo2?.[ssp], band, year, co2, (v) => v > 0) : 0;

/**
 * kg of methane a change in NOx leaves in the air in a year, more as NOx falls: each sector's
 * change in CO₂ times its methane per kg of CO₂ through its NOx, which counts where the NOx is
 * emitted (ships' destroys more methane per kg than that emitted on land). Sectors that keep
 * their NOx leave none.
 */
export const noxMethane = (
  co: Partial<CoEmissions> | undefined,
  ssp: Ssp,
  band: Band,
  year: number,
  changes: CoYear,
  variant: NoxMethane,
): number => (hasCoEmissions(co) ? noxMethaneOf(co, ssp, band, year, changes, variant) : 0);

const noxMethaneOf = (
  co: CoEmissions,
  ssp: Ssp,
  band: Band,
  year: number,
  { co2, keepsNox = [] }: CoYear,
  variant: NoxMethane,
): number => {
  const perKg = co.noxCh4PerKgCo2[variant][ssp];
  return (Object.keys(co2) as CoSector[])
    .filter((s) => co2[s] !== 0 && perKg[s] && !keepsNox.includes(s))
    .reduce((total, s) => {
      const v = co2[s] as number;
      return total - towards(rangeAt(co, perKg[s], year), band, v > 0) * v;
    }, 0);
};

export interface AirPollutionPaths {
  /** W/m² by year. */
  forcing: number[];
  /** kg of methane NOx and VOCs leave in the air, by year. */
  methane: number[];
}

/** The paths of a band from each year's changes. */
export const airPollutionPaths = (
  co: Partial<CoEmissions> | undefined,
  ssp: Ssp,
  band: Band,
  years: readonly number[],
  changes: readonly CoYear[],
  variant: NoxMethane,
): AirPollutionPaths => ({
  forcing: years.map((y, i) => airPollutionForcing(co, ssp, band, y, changes[i] as CoYear)),
  methane: years.map(
    (y, i) =>
      noxMethane(co, ssp, band, y, changes[i] as CoYear, variant) +
      vocMethane(co, ssp, band, y, changes[i] as CoYear),
  ),
});

/**
 * Warming from air pollution paths starting in `startYear`, °C on `tYears`: the forcing through
 * the response to a year of forcing, the methane NOx leaves through methane's AGTP.
 */
export const airPollutionWarming = (
  paths: AirPollutionPaths,
  startYear: number,
  response: readonly number[],
  climate: Climate,
  method: ClimateMethod,
  band: Band,
  tYears: readonly number[],
): number[] => {
  const forcing = convolve(paths.forcing, startYear, response, tYears);
  const methane = convolve(paths.methane, startYear, agtpOf(climate, method, 'ch4', band), tYears);
  return tYears.map((_, i) => (forcing[i] as number) + (methane[i] as number));
};
