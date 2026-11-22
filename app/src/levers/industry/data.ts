import type { Range3, Series, Ssp } from '../../data/types';

/** The sectors the clean-heating and clean-industry levers act on. */
export const INDUSTRY_SECTORS = ['buildings', 'industry'] as const;
export type IndustrySector = (typeof INDUSTRY_SECTORS)[number];

/** The parts of industry the clean-industry lever acts on. */
export const INDUSTRY_PARTS = ['steel', 'cement'] as const;
export type IndustryPart = (typeof INDUSTRY_PARTS)[number];

/**
 * A part of industry: its share of industry's direct CO₂, the share of its own CO₂ gone at full
 * adoption, and the electricity drawn per kg of CO₂ avoided (kWh/kg).
 */
export interface PartDef {
  share: number;
  cut: Range3;
  kwhPerKgCo2: Range3;
}

/**
 * industry.json: direct fossil CO₂ of buildings and of industry under each SSP, and what their
 * levers need. co2[ssp][sector]: kg CO₂ per year, base year..2100, part of the SSP's fossil CO₂.
 * heatPumpKwhPerKgCo2: electricity a heat pump draws per kg of a boiler's CO₂ it avoids.
 * industryParts: steel and cement. cementProcessCo2: the Global Carbon Budget's cement process
 * CO₂ in the base year, kg, from which cement's share is made.
 */
export interface Industry {
  co2: Record<Ssp, Record<IndustrySector, Series>>;
  heatPumpKwhPerKgCo2: Range3;
  industryParts: Record<IndustryPart, PartDef>;
  cementProcessCo2: { year: number; kg: number };
  source: string;
}

export const EMPTY_INDUSTRY = {} as Industry;

declare module '../../data/types' {
  interface ModelData {
    industry: Industry;
  }
}
