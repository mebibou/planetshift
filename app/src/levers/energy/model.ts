import type { Ssp } from '../../data/types';
import { towards } from '../../model/bands';
import type { Band } from '../../model/climate';
import { valueAt } from '../../model/util';
import { coChange, NO_CO_CHANGE, type CoYear, type KeepsNox } from './coemissions';
import type { CoEmissions, Sector, Sectors } from './data';

/** Levers on the fossil CO₂ of transport, electricity and data centres (sectors.md). */
export const ENERGY_LEVERS = [
  'electricCars',
  'electricTrucks',
  'flyLess',
  'cleanAviationFuel',
  'cleanShipping',
  'renewableElectricity',
  'cleanDataCentres',
] as const;
export type EnergyLever = (typeof ENERGY_LEVERS)[number];

/**
 * 'iea': data centres' electricity beyond 2024, which the SSPs did not foresee, is added to the
 * baseline (IEA, Energy and AI). 'ssp': the SSPs' own electricity, as published.
 */
export type DataCentres = 'iea' | 'ssp';

const KWH_PER_TWH = 1e9;

/** Whether sectors.json was loaded with data for every lever to act on. */
export const hasSectors = (sectors: Partial<Sectors> | undefined): sectors is Sectors =>
  sectors?.co2 !== undefined && Object.keys(sectors.co2).length > 0;

/** kg of CO₂ a sector emits in a year under an SSP. */
export const sectorCo2 = (sectors: Sectors, ssp: Ssp, sector: Sector, year: number): number => {
  const s = sectors.co2[ssp][sector];
  return s ? valueAt(s.years, s.values, year) : 0;
};

/** kg of CO₂ per kWh generated, never below zero. */
export const gridAt = (sectors: Sectors, ssp: Ssp, year: number): number => {
  const g = sectors.gridIntensity[ssp];
  return g ? Math.max(0, valueAt(g.years, g.values, year)) : 0;
};

/** kWh a year data centres use beyond 2024's, in the band's direction (more demand, more to avoid). */
export const dataCentreKwh = (sectors: Sectors, year: number, band: Band): number => {
  const d = sectors.dataCentresTwh;
  const series = band === 'median' ? d.median : band === 'p95' ? d.high : d.low;
  return d.years.length > 0 ? Math.max(0, valueAt(d.years, series, year)) * KWH_PER_TWH : 0;
};

/** kg of CO₂ the data centres' extra demand emits each year on the SSP's grid; 0 for 'ssp'. */
export const dataCentreBaseline = (
  sectors: Sectors,
  ssp: Ssp,
  option: DataCentres,
  years: readonly number[],
  band: Band,
): number[] =>
  years.map((y) =>
    option === 'iea' && hasSectors(sectors)
      ? dataCentreKwh(sectors, y, band) * gridAt(sectors, ssp, y)
      : 0,
  );

/** Every energy lever's adoption reached in a year. */
export type EnergyAdoption = Record<EnergyLever, number>;

export const energyAdoption = (adoption: (id: string) => number, share: number): EnergyAdoption =>
  Object.fromEntries(ENERGY_LEVERS.map((id) => [id, adoption(id) * share])) as EnergyAdoption;

export interface YearContext {
  sectors: Sectors;
  ssp: Ssp;
  dataCentres: DataCentres;
  band: Band;
}

/** The sectors whose fossil CO₂ the energy levers change. */
export type EnergySource =
  'roadPassenger' | 'roadFreight' | 'aviation' | 'shipping' | 'electricity';

/**
 * Change in fossil CO₂ in a year by the sector that emits it, kg (negative when avoided). An
 * electric vehicle saves its tailpipe CO₂ and draws electricity on the grid left after renewable
 * electricity; less flying and clean fuel combine on aviation's CO₂, each acting on what the
 * other leaves; data centres (option 'iea') change from their baseline emissions to those on the
 * cleaner grid, less what runs on clean power.
 */
export const energyCo2BySource = (
  ctx: YearContext,
  year: number,
  a: EnergyAdoption,
): Record<EnergySource, number> => {
  const { sectors, ssp, band } = ctx;
  const co2 = (s: Sector) => sectorCo2(sectors, ssp, s, year);
  const grid = gridAt(sectors, ssp, year);
  const cleanGrid = grid * (1 - a.renewableElectricity);
  const passenger = a.electricCars * co2('roadPassenger');
  const freight = a.electricTrucks * co2('roadFreight');
  const drawn =
    (passenger * towards(sectors.evKwhPerKgCo2.passenger, band, false) +
      freight * towards(sectors.evKwhPerKgCo2.freight, band, false)) *
    cleanGrid;
  const dataCentres =
    ctx.dataCentres === 'iea'
      ? dataCentreKwh(sectors, year, band) * (grid - cleanGrid * (1 - a.cleanDataCentres))
      : 0;
  return {
    roadPassenger: -passenger,
    roadFreight: -freight,
    aviation: -co2('aviation') * (1 - (1 - a.flyLess) * (1 - a.cleanAviationFuel)),
    shipping: -a.cleanShipping * co2('shipping'),
    electricity: drawn - a.renewableElectricity * co2('electricity') - dataCentres,
  };
};

/** Change in aviation's non-CO₂ forcing in a year, W/m²: it goes with the flights not flown. */
export const nonCo2ForcingChange = (ctx: YearContext, year: number, a: EnergyAdoption): number =>
  -towards(ctx.sectors.aviationNonCo2, ctx.band, true) *
  a.flyLess *
  sectorCo2(ctx.sectors, ctx.ssp, 'aviation', year);

/**
 * Ships on ammonia or methanol still burn fuel: their NOx, made from the air's nitrogen in the
 * engine, stays; the fuel's sulphur, soot and supply go. (Aviation's own emissions are in its
 * non-CO₂ forcing, which clean fuel leaves.)
 */
export const CLEAN_FUEL_KEEPS_NOX: KeepsNox = ['shipping'];

export interface EnergyPaths {
  /** kg of fossil CO₂ a year, by year (negative when avoided). */
  co2: number[];
  /** That CO₂ by sector and what comes with it (methane, air pollution), by year. */
  co: CoYear[];
  /** W/m² of aviation's non-CO₂ forcing, by year. */
  forcing: number[];
}

/** The energy levers' changes each year, ramping in like the shift; all zero without sectors.json. */
export const energyPaths = (
  sectors: Partial<Sectors> | undefined,
  co: Partial<CoEmissions> | undefined,
  adoption: (id: string) => number,
  ssp: Ssp,
  dataCentres: DataCentres,
  band: Band,
  years: readonly number[],
  shareAt: (year: number) => number,
): EnergyPaths => {
  if (!hasSectors(sectors) || !ENERGY_LEVERS.some((id) => adoption(id) > 0))
    return {
      co2: years.map(() => 0),
      co: years.map(() => ({ co2: {}, change: NO_CO_CHANGE })),
      forcing: years.map(() => 0),
    };
  const ctx: YearContext = { sectors, ssp, dataCentres, band };
  const adoptions = years.map((y) => energyAdoption(adoption, shareAt(y)));
  const bySource = years.map((y, i) => energyCo2BySource(ctx, y, adoptions[i] as EnergyAdoption));
  return {
    co2: bySource.map((s) => Object.values(s).reduce((total, v) => total + v, 0)),
    co: years.map((y, i) => {
      const co2 = bySource[i] as Record<EnergySource, number>;
      return {
        co2,
        change: coChange(co, ssp, y, co2, CLEAN_FUEL_KEEPS_NOX),
        keepsNox: CLEAN_FUEL_KEEPS_NOX,
      };
    }),
    forcing: years.map((y, i) => nonCo2ForcingChange(ctx, y, adoptions[i] as EnergyAdoption)),
  };
};

/** The forcing response curve of a band (°C per W/m² held a year, by horizon). */
export const forcingResponseOf = (sectors: Partial<Sectors> | undefined, band: Band): number[] => {
  const r = sectors?.forcingResponse;
  return r ? (r[band].length > 0 ? r[band] : r.median) : [];
};
