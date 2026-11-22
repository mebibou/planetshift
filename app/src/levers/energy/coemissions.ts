import type { Climate, ClimateMethod, Range3, Ssp } from '../../data/types';
import { towards } from '../../model/bands';
import { agtpOf, convolve, type Band } from '../../model/climate';
import { valueAt } from '../../model/util';
import {
  CO_SPECIES,
  type CoEmissions,
  type CoSector,
  type CoSpecies,
  type RangeSeries,
} from './data';

/** kg a year of each co-emitted species (negative when avoided). */
export type CoChange = Record<CoSpecies, number>;

export const NO_CO_CHANGE: CoChange = { ch4: 0, so2: 0, bc: 0, oc: 0, nox: 0 };

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
): CoChange => {
  if (!hasCoEmissions(co)) return NO_CO_CHANGE;
  const ratios = co.perKgCo2[ssp];
  const sectors = (Object.keys(co2) as CoSector[]).filter((s) => co2[s] !== 0 && ratios[s]);
  return Object.fromEntries(
    CO_SPECIES.map((species) => [
      species,
      sectors.reduce(
        (total, s) =>
          species === 'nox' && keepsNox.includes(s)
            ? total
            : total + (co2[s] as number) * valueAt(co.years, ratios[s][species], year),
        0,
      ),
    ]),
  ) as CoChange;
};

const rangeAt = (co: CoEmissions, r: RangeSeries, year: number): Range3 => ({
  median: valueAt(co.years, r.median, year),
  low: valueAt(co.years, r.low, year),
  high: valueAt(co.years, r.high, year),
});

/** A year's changes: fossil CO₂ by sector, and what comes with it. */
export interface CoYear {
  co2: Readonly<Partial<Record<CoSector, number>>>;
  change: CoChange;
  /** Sectors whose NOx stays as their CO₂ goes. */
  keepsNox?: KeepsNox;
}

/**
 * Change in forcing from a change in air pollution in a year, W/m²: the particles' forcing per kg
 * of each sector's CO₂ (sulphate and organic carbon cool, black carbon warms), and NOx's own
 * (its ozone, less its nitrate). Fewer cooling particles warm. Each band takes the end of each
 * range that moves the warming avoided its way.
 */
export const airPollutionForcing = (
  co: Partial<CoEmissions> | undefined,
  ssp: Ssp,
  band: Band,
  year: number,
  { co2, change }: CoYear,
): number => {
  if (!hasCoEmissions(co)) return 0;
  const particles = co.particleErfPerKgCo2[ssp];
  const sectors = (Object.keys(co2) as CoSector[]).filter((s) => co2[s] !== 0 && particles[s]);
  const nox =
    change.nox === 0
      ? 0
      : towards(rangeAt(co, co.erfPerKg[ssp].nox, year), band, change.nox < 0) * change.nox;
  return sectors.reduce((total, s) => {
    const v = co2[s] as number;
    return total + towards(rangeAt(co, particles[s], year), band, v < 0) * v;
  }, nox);
};

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
  { co2, keepsNox = [] }: CoYear,
): number => {
  if (!hasCoEmissions(co)) return 0;
  const perKg = co.noxCh4PerKgCo2[ssp];
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
  /** kg of methane NOx leaves in the air, by year. */
  methane: number[];
}

/** The paths of a band from each year's changes. */
export const airPollutionPaths = (
  co: Partial<CoEmissions> | undefined,
  ssp: Ssp,
  band: Band,
  years: readonly number[],
  changes: readonly CoYear[],
): AirPollutionPaths => ({
  forcing: years.map((y, i) => airPollutionForcing(co, ssp, band, y, changes[i] as CoYear)),
  methane: years.map((y, i) => noxMethane(co, ssp, band, y, changes[i] as CoYear)),
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
