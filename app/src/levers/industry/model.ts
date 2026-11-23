import type { Ssp } from '../../data/types';
import { towards } from '../../model/bands';
import type { Band } from '../../model/climate';
import { sum, valueAt } from '../../model/util';
import { coChange, NO_CO_CHANGE, type CoYear } from '../energy/coemissions';
import type { CoEmissions, Sectors } from '../energy/data';
import { gridAt, hasSectors } from '../energy/model';
import { INDUSTRY_PARTS, type Industry, type IndustrySector, type PartDef } from './data';

/** Levers on the direct fossil CO₂ of buildings and of industry (industry.md). */
export const INDUSTRY_LEVERS = ['cleanHeating', 'cleanIndustry'] as const;
export type IndustryLever = (typeof INDUSTRY_LEVERS)[number];

/** The energy lever whose cleaner grid the heat pumps and clean industry draw on. */
export const RENEWABLE_ELECTRICITY = 'renewableElectricity';

/** Whether industry.json was loaded with data for the levers to act on. */
export const hasIndustry = (industry: Partial<Industry> | undefined): industry is Industry =>
  industry?.co2 !== undefined && Object.keys(industry.co2).length > 0;

/** kg of CO₂ a sector emits in a year under an SSP. */
export const industryCo2 = (
  industry: Industry,
  ssp: Ssp,
  sector: IndustrySector,
  year: number,
): number => {
  const s = industry.co2[ssp]?.[sector];
  return s ? valueAt(s.years, s.values, year) : 0;
};

/** The adoptions reached in a year: the two levers and renewable electricity. */
export interface IndustryAdoption {
  cleanHeating: number;
  cleanIndustry: number;
  renewableElectricity: number;
}

export interface YearContext {
  industry: Industry;
  sectors: Sectors;
  ssp: Ssp;
  band: Band;
}

/** The sectors whose fossil CO₂ the heating and industry levers change. */
export type IndustrySource = 'buildings' | 'industry' | 'electricity';

/**
 * Change in fossil CO₂ in a year by the sector that emits it, kg (negative when avoided): heat
 * pumps save buildings' CO₂ and clean steel and cement save their part of industry's, and both
 * draw electricity on the grid left after renewable electricity.
 */
export const industryCo2BySource = (
  ctx: YearContext,
  year: number,
  a: IndustryAdoption,
): Record<IndustrySource, number> => {
  const { industry, sectors, ssp, band } = ctx;
  const grid = gridAt(sectors, ssp, year) * (1 - a.renewableElectricity);
  const heated = a.cleanHeating * industryCo2(industry, ssp, 'buildings', year);
  const made = a.cleanIndustry * industryCo2(industry, ssp, 'industry', year);
  const parts = INDUSTRY_PARTS.map((name) => industry.industryParts[name]);
  const cut = (p: PartDef) => p.share * towards(p.cut, band, true);
  return {
    buildings: -heated,
    industry: -made * sum(parts.map(cut)),
    electricity:
      (heated * towards(industry.heatPumpKwhPerKgCo2, band, false) +
        made * sum(parts.map((p) => cut(p) * towards(p.kwhPerKgCo2, band, false)))) *
      grid,
  };
};

export interface IndustryPaths {
  /** kg of fossil CO₂ a year, by year (negative when avoided). */
  co2: number[];
  /** That CO₂ by sector and what comes with it (methane, air pollution), by year. */
  co: CoYear[];
}

/** The levers' changes each year, ramping in like the shift; zero without the data. */
export const industryPaths = (
  industry: Partial<Industry> | undefined,
  sectors: Partial<Sectors> | undefined,
  co: Partial<CoEmissions> | undefined,
  adoption: (id: string) => number,
  ssp: Ssp,
  band: Band,
  years: readonly number[],
  shareAt: (year: number) => number,
): IndustryPaths => {
  if (
    !hasIndustry(industry) ||
    !hasSectors(sectors) ||
    !INDUSTRY_LEVERS.some((id) => adoption(id) > 0)
  )
    return { co2: years.map(() => 0), co: years.map(() => ({ co2: {}, change: NO_CO_CHANGE })) };
  const ctx: YearContext = { industry, sectors, ssp, band };
  const bySource = years.map((y) =>
    industryCo2BySource(ctx, y, {
      cleanHeating: adoption('cleanHeating') * shareAt(y),
      cleanIndustry: adoption('cleanIndustry') * shareAt(y),
      renewableElectricity: adoption(RENEWABLE_ELECTRICITY) * shareAt(y),
    }),
  );
  return {
    co2: bySource.map((s) => s.buildings + s.industry + s.electricity),
    co: years.map((y, i) => {
      const co2 = bySource[i] as Record<IndustrySource, number>;
      return { co2, change: coChange(co, ssp, y, co2) };
    }),
  };
};
