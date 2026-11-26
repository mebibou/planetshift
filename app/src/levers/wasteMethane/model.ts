import type { Chain, Ssp } from '../../data/types';
import { towards } from '../../model/bands';
import { factorOf } from '../../model/chain';
import type { Band } from '../../model/climate';
import { builtUp } from '../../model/timePath';
import { dataValueAt } from '../../model/util';
import type { BySector, CountryWasteMethane, WasteMethane, WasteMethaneCountry } from './data';

/** Levers on the methane of landfills and wastewater (landfills.md). */

/** The levers' adoption reached in a year: capture and wastewater at once, diversion with decay. */
export interface Reached {
  captured: number;
  diverted: number;
  wastewater: number;
}

/** The factors of a band: capture, diversion and the wastewater cut at full adoption. */
export interface Factors {
  capture: number;
  diversion: number;
  wastewaterCut: number;
}

export const factorsOf = (file: WasteMethane, band: Band): Factors => ({
  capture: towards(file.capture, band, true),
  diversion: towards(file.diversion, band, true),
  wastewaterCut: towards(file.wastewaterCut, band, true),
});

/**
 * The share of each sector's methane the levers remove: gas collection on the managed share of
 * the landfills' methane, and diversion of what is left of it; the wastewater cut.
 */
export const sectorCuts = (managed: number, f: Factors, r: Reached): BySector => ({
  landfill: 1 - (1 - r.captured * f.capture * managed) * (1 - r.diverted * f.diversion),
  wastewater: r.wastewater * f.wastewaterCut,
});

/**
 * A sector's change with the levers: the food levers' change, never below none left, then the
 * cut on what is left.
 */
const changeOf = (before: number, food: number, cut: number): number => {
  const left = Math.max(0, before + food);
  return left - before - cut * left;
};

/** Each sector's change with the food levers' change and the cuts. */
export const sectorChange = (before: BySector, food: BySector, cuts: BySector): BySector => ({
  landfill: changeOf(before.landfill, food.landfill, cuts.landfill),
  wastewater: changeOf(before.wastewater, food.wastewater, cuts.wastewater),
});

/**
 * The food levers' change in a country's waste methane, kg a year: its food waste's and
 * wastewater's methane per tonne, shared by mass, times its change in production.
 */
export const foodChange = (chain: Chain | undefined, iso3: string, tonnes: number): BySector => ({
  landfill: chain ? factorOf(chain, iso3, 'waste', 'ch4') * tonnes : 0,
  wastewater: chain ? factorOf(chain, iso3, 'wastewater', 'ch4') * tonnes : 0,
});

/** A country's waste methane on the map: CEDS's, the food levers' change, all levers' in full. */
export const countryWasteMethane = (
  row: WasteMethaneCountry,
  food: BySector,
  f: Factors,
  adoption: { landfills: number; wastewater: number },
): CountryWasteMethane => {
  const before = { landfill: row.landfill, wastewater: row.wastewater };
  const cuts = sectorCuts(row.managed, f, {
    captured: adoption.landfills,
    diverted: adoption.landfills,
    wastewater: adoption.wastewater,
  });
  return { before, food, change: sectorChange(before, food, cuts) };
};

/** The scenario's waste methane in a year, kg. */
export const scenarioCh4 = (file: WasteMethane, ssp: Ssp, year: number): number => {
  const s = file.ch4[ssp];
  return s ? dataValueAt(s.years, s.values, year) : 0;
};

/** Each country's landfill and wastewater methane, managed share and food levers' change, kg. */
export interface Columns {
  landfill: Float64Array;
  wastewater: Float64Array;
  managed: Float64Array;
  foodLandfill: Float64Array;
  foodWastewater: Float64Array;
}

export const columnsOf = (file: WasteMethane, food: ReadonlyMap<string, BySector>): Columns => {
  const rows = Object.entries(file.byCountry);
  const col = (f: (iso3: string, r: WasteMethaneCountry) => number) =>
    Float64Array.from(rows, ([iso3, r]) => f(iso3, r));
  return {
    landfill: col((_, r) => r.landfill),
    wastewater: col((_, r) => r.wastewater),
    managed: col((_, r) => r.managed),
    foodLandfill: col((iso3) => food.get(iso3)?.landfill ?? 0),
    foodWastewater: col((iso3) => food.get(iso3)?.wastewater ?? 0),
  };
};

/**
 * A year's terms: the scenario's waste methane over CEDS's, the food levers' change reached, and
 * the capture, diversion and wastewater cuts reached.
 */
export interface YearCuts {
  scale: number;
  foodShare: number;
  capture: number;
  diversion: number;
  wastewater: number;
}

/** The countries' change in a year by the levers alone, kg (negative when avoided). */
export const yearChange = (c: Columns, y: YearCuts): number => {
  let kg = 0;
  for (let i = 0; i < c.landfill.length; i++) {
    const lf = Math.max(
      0,
      (c.landfill[i] as number) * y.scale + (c.foodLandfill[i] as number) * y.foodShare,
    );
    const ww = Math.max(
      0,
      (c.wastewater[i] as number) * y.scale + (c.foodWastewater[i] as number) * y.foodShare,
    );
    const cut = 1 - (1 - y.capture * (c.managed[i] as number)) * (1 - y.diversion);
    kg = kg + cut * lf + y.wastewater * ww;
  }
  return -kg;
};

export interface PathInput {
  file: WasteMethane;
  ssp: Ssp;
  band: Band;
  years: readonly number[];
  shareAt: (year: number) => number;
  adoption: { landfills: number; wastewater: number };
  columns: Columns;
  /** The food levers' change in a year over the base year's. */
  foodScale: (year: number) => number;
}

/**
 * The levers' change in the world's methane each year, kg: every country's share of the
 * scenario's waste methane (CEDS's), less the food levers' change, cut by the capture and the
 * wastewater cut as they ramp in and by the diversion as buried waste decays.
 */
export const wasteMethanePath = (p: PathInput): number[] => {
  const { file, band, years, shareAt, adoption } = p;
  const f = factorsOf(file, band);
  const decayed = builtUp(shareAt, years, towards(file.decayYears, band, false));
  return years.map((year) => {
    const share = shareAt(year);
    return yearChange(p.columns, {
      scale: scenarioCh4(file, p.ssp, year) / file.total,
      foodShare: share * p.foodScale(year),
      capture: adoption.landfills * share * f.capture,
      diversion: adoption.landfills * decayed(year) * f.diversion,
      wastewater: adoption.wastewater * share * f.wastewaterCut,
    });
  });
};
