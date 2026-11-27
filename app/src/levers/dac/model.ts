import type { Ssp } from '../../data/types';
import { towards } from '../../model/bands';
import type { Band } from '../../model/climate';
import { valueAt } from '../../model/util';
import { coChange, NO_CO_CHANGE, type CoYear } from '../energy/coemissions';
import type { CoEmissions, Sectors } from '../energy/data';
import { gridAt, hasSectors } from '../energy/model';
import { NO_LEAKS, withLeaks, type LeaksOf } from '../fossilMethane/model';
import { RENEWABLE_ELECTRICITY } from '../industry/model';
import constants from './dac.json';
import { DAC_LEVER, type Dac, type PlantEnergy } from './data';
export { DAC_LEVER };

/** Direct air capture with storage, on its own path (dac.md). */

export const DAC: Dac = constants;

const KG_PER_GT = 1e12;
const KG_PER_TONNE = 1000;

/**
 * kg of CO₂ stored a year at full adoption, by milestone year: the Net Zero scenario's capture
 * times the share stored, then the Delayed Action Case's storage.
 */
export const storedMilestones = (dac: Dac): { years: number[]; values: number[] } => ({
  years: [...dac.netZero.years, dac.delayedAction.year],
  values: [
    ...dac.netZero.capturedGt.map((gt) => gt * dac.storedShare * KG_PER_GT),
    dac.delayedAction.storedGt * KG_PER_GT,
  ],
});

/** kg of CO₂ stored in a year at full adoption, linear between the milestones. */
export const storedAt = (dac: Dac, year: number): number => {
  const m = storedMilestones(dac);
  return valueAt(m.years, m.values, year);
};

/** kWh of grid electricity a tonne: the plant's own, and its heat pump's for the heat. */
export const kwhPerTonne = (e: PlantEnergy): number => e.electricityKwh + e.heatKwh / e.cop;

/** kWh a tonne in the direction of the band: more energy avoids less warming. */
export const kwhPerTonneIn = (dac: Dac, band: Band): number =>
  towards(
    {
      median: kwhPerTonne(dac.energy.median),
      low: kwhPerTonne(dac.energy.low),
      high: kwhPerTonne(dac.energy.high),
    },
    band,
    false,
  );

/** The CO₂ of building the plants and making their sorbent, per kg captured, in the band's direction. */
export const embodiedIn = (dac: Dac, band: Band): number => towards(dac.embodiedShare, band, false);

export interface YearContext {
  dac: Dac;
  sectors: Sectors;
  ssp: Ssp;
  band: Band;
}

/** The capture's CO₂ in a year, kg: taken from the air (negative), its electricity's and its plants'. */
export interface DacCo2 {
  captured: number;
  electricity: number;
  embodied: number;
}

/**
 * The CO₂ of a year at an adoption of the path, with the share of the grid renewable electricity
 * has cleaned that year.
 */
export const dacCo2In = (
  ctx: YearContext,
  year: number,
  adoption: number,
  renewable: number,
): DacCo2 => {
  const { dac, sectors, ssp, band } = ctx;
  const stored = adoption * storedAt(dac, year);
  const grid = gridAt(sectors, ssp, year) * (1 - renewable);
  return {
    captured: -stored,
    electricity: (stored / KG_PER_TONNE) * kwhPerTonneIn(dac, band) * grid,
    embodied: stored * embodiedIn(dac, band),
  };
};

/** The share of what is captured that is removed once its electricity and plants are counted. */
export const netShare = (co2: DacCo2): number =>
  co2.captured === 0 ? 0 : (co2.captured + co2.electricity + co2.embodied) / co2.captured;

export interface DacPaths {
  /** kg of CO₂ a year, by year (negative when removed), before what comes with its electricity. */
  co2: number[];
  /** Its electricity's CO₂ and what comes with it (methane, air pollution), by year. */
  co: CoYear[];
}

/** The capture's paths, on its own path; zero without the grid's data. */
export const dacPaths = (
  dac: Dac,
  sectors: Partial<Sectors> | undefined,
  co: Partial<CoEmissions> | undefined,
  adoption: (id: string) => number,
  ssp: Ssp,
  band: Band,
  years: readonly number[],
  shareAt: (year: number) => number,
  leaks: LeaksOf = NO_LEAKS,
): DacPaths =>
  hasSectors(sectors) && adoption(DAC_LEVER) > 0
    ? actingPaths({ dac, sectors, ssp, band }, co, adoption, years, shareAt, leaks)
    : { co2: years.map(() => 0), co: years.map(() => ({ co2: {}, change: NO_CO_CHANGE })) };

const actingPaths = (
  ctx: YearContext,
  co: Partial<CoEmissions> | undefined,
  adoption: (id: string) => number,
  years: readonly number[],
  shareAt: (year: number) => number,
  leaks: LeaksOf,
): DacPaths => {
  const byYear = years.map((y) =>
    dacCo2In(ctx, y, adoption(DAC_LEVER), adoption(RENEWABLE_ELECTRICITY) * shareAt(y)),
  );
  return {
    co2: byYear.map((c) => c.captured + c.electricity + c.embodied),
    co: years.map((y, i) => {
      const co2 = { electricity: (byYear[i] as DacCo2).electricity };
      return { co2, change: withLeaks(coChange(co, ctx.ssp, y, co2), leaks(y, co2)) };
    }),
  };
};
