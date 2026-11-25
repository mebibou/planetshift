import type { Departures } from '../../config';
import type { Range3, Series, Ssp } from '../../data/types';

/** Parts of the economy outside farming whose emissions a lever can cut. */
export const SECTORS = [
  'roadPassenger',
  'roadFreight',
  'aviation',
  'shipping',
  'electricity',
  'dataCentres',
] as const;
export type Sector = (typeof SECTORS)[number];

/**
 * sectors.json: fossil CO₂ of each sector under each SSP, and what the energy levers need.
 * co2[ssp][sector]: kg CO₂ per year, base year..2100, harmonised to recent inventories; the
 * sectors are part of the SSP's fossil CO₂, not added to it (dataCentres is the exception:
 * electricity demand beyond the SSP, see dataCentresTwh).
 * gridIntensity[ssp]: kg CO₂ per kWh of electricity generated, base year..2100.
 * evKwhPerKgCo2: electricity a vehicle needs once electric, per kg of tailpipe CO₂ it no longer
 * emits (kWh/kg), passenger and freight.
 * dataCentresTwh: data-centre electricity demand added on top of the SSP, TWh per year, with a range.
 * aviationNonCo2: aviation's non-CO₂ effective radiative forcing (contrails, NOx…) per kg of
 * aviation CO₂ emitted that year, W/m² per (kg/yr), with a range; it lasts only while flying does.
 * forcingResponse: global temperature response to 1 W/m² of forcing held for one year, °C, at
 * horizons 0..H years, median and range (from FaIR, like the AGTP curves).
 */
export interface Sectors {
  co2: Record<Ssp, Record<Sector, Series>>;
  gridIntensity: Record<Ssp, Series>;
  evKwhPerKgCo2: { passenger: Range3; freight: Range3 };
  dataCentresTwh: { years: number[]; median: number[]; low: number[]; high: number[] };
  aviationNonCo2: Range3;
  forcingResponse: { median: number[]; p05: number[]; p95: number[] };
  source: string;
}

export const EMPTY_SECTORS = {} as Sectors;

/** The sectors whose fossil CO₂ comes with methane and air pollution, in coemissions.json. */
export const CO_SECTORS = [
  'roadPassenger',
  'roadFreight',
  'aviation',
  'shipping',
  'electricity',
  'buildings',
  'industry',
  'aviationOwn',
] as const;
export type CoSector = (typeof CO_SECTORS)[number];

/** The variants of NOx's methane coemissions.json holds, one per value of the departure. */
export type NoxMethane = Departures['noxMethane'];

/**
 * What comes with fossil CO₂: the CO₂ of producing the fuel (refineries, coke ovens, flaring),
 * methane and N₂O, and air pollution (sulphur dioxide, black and organic carbon, ammonia,
 * nitrogen oxides, carbon monoxide and volatile organic compounds).
 */
export const CO_SPECIES = [
  'co2',
  'ch4',
  'n2o',
  'so2',
  'bc',
  'oc',
  'nh3',
  'nox',
  'co',
  'voc',
] as const;
export type CoSpecies = (typeof CO_SPECIES)[number];
export const AIR_POLLUTANTS = ['so2', 'bc', 'oc', 'nh3', 'nox', 'co', 'voc'] as const;
export type AirPollutant = (typeof AIR_POLLUTANTS)[number];

/** A value by year of `CoEmissions.years`, with the 5–95% range of FaIR's ensemble. */
export interface RangeSeries {
  median: number[];
  low: number[];
  high: number[];
}

/**
 * coemissions.json: what each sector's fossil CO₂ comes with under each SSP, on `years`.
 * perKgCo2[ssp][sector][species]: kg emitted per kg of the sector's fossil CO₂, producing its
 * fuel (methane from coal mines, oil and gas; `co2` is producing it alone) and burning it;
 * aviation's own are in
 * `Sectors.aviationNonCo2`, so only its fuel's supply is under aviation, and aviationOwn holds
 * them, without the supply, for the plain-FaIR aviationNonCo2 departure.
 * erfPerKg[ssp][pollutant]: effective radiative forcing per kg a year, W/m² per (kg/yr), at the
 * SSP's level of air pollution that year (FaIR's aerosol-cloud effect is a logarithm).
 * noxCh4PerKg[ssp]: kg of methane a kg less NOx leaves in the air each year, as NOx shortens
 * methane's lifetime.
 * noxCh4PerKgCo2[variant][ssp][sector]: kg of methane left in the air per kg of the sector's CO₂
 * cut, through its NOx, scaled for where the NOx is emitted by the variant (noxPlaceFactor: land
 * and sea, relative to FaIR's global coefficient).
 * vocCh4PerKg[ssp], vocCh4PerKgCo2[ssp][sector]: the same for VOCs, which lengthen methane's
 * lifetime, so a kg less leaves less methane (negative); one coefficient everywhere.
 * coCh4PerKg, coCh4PerKgCo2: the same for carbon monoxide, under the coMethane departure only.
 * coMethaneSplit: what replaces the VOCs' methane and the chemistry variant of NOx's, and adds
 * CO's, once CO is split from FaIR's VOC term.
 * particleErfPerKgCo2[ssp][sector]: forcing of the SO₂, black and organic carbon and ammonia that
 * come with a kg a year of the sector's CO₂, W/m² per (kg/yr), its range added up member by
 * member; ozoneErfPerKgCo2, the same for the ozone of carbon monoxide and VOCs.
 */
export interface CoEmissions {
  years: number[];
  perKgCo2: Record<Ssp, Record<CoSector, Record<CoSpecies, number[]>>>;
  erfPerKg: Record<Ssp, Record<AirPollutant, RangeSeries>>;
  noxCh4PerKg: Record<Ssp, RangeSeries>;
  noxCh4PerKgCo2: Record<NoxMethane, Record<Ssp, Record<CoSector, RangeSeries>>>;
  noxPlaceFactor: Record<NoxMethane, Record<Ssp, Record<'land' | 'sea', RangeSeries>>>;
  vocCh4PerKg: Record<Ssp, RangeSeries>;
  vocCh4PerKgCo2: Record<Ssp, Record<CoSector, RangeSeries>>;
  coCh4PerKg?: Record<Ssp, RangeSeries>;
  coCh4PerKgCo2?: Record<Ssp, Record<CoSector, RangeSeries>>;
  coMethaneSplit?: CoMethaneSplit;
  particleErfPerKgCo2: Record<Ssp, Record<CoSector, RangeSeries>>;
  ozoneErfPerKgCo2: Record<Ssp, Record<CoSector, RangeSeries>>;
  source: string;
}

export interface CoMethaneSplit {
  vocCh4PerKg: Record<Ssp, RangeSeries>;
  vocCh4PerKgCo2: Record<Ssp, Record<CoSector, RangeSeries>>;
  coCh4PerKg: Record<Ssp, RangeSeries>;
  coCh4PerKgCo2: Record<Ssp, Record<CoSector, RangeSeries>>;
  noxCh4PerKgCo2: Partial<CoEmissions['noxCh4PerKgCo2']>;
}

export const EMPTY_COEMISSIONS = {} as CoEmissions;

declare module '../../data/types' {
  interface ModelData {
    sectors: Sectors;
    coemissions: CoEmissions;
  }
}

export const ENERGY_LEVERS = [
  'electricCars',
  'electricTrucks',
  'flyLess',
  'cleanAviationFuel',
  'cleanShipping',
  'renewableElectricity',
] as const;
export type EnergyLever = (typeof ENERGY_LEVERS)[number];

/**
 * 'iea': data centres' electricity beyond 2024, which the SSPs did not foresee, is added to the
 * baseline (IEA, Energy and AI). 'ssp': the SSPs' own electricity, as published.
 */
export type DataCentres = 'iea' | 'ssp';

/** Whether sectors.json was loaded with data for every lever to act on. */
export const hasSectors = (sectors: Partial<Sectors> | undefined): sectors is Sectors =>
  sectors?.co2 !== undefined && Object.keys(sectors.co2).length > 0;
