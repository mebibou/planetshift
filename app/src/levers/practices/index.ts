import { bandRecord } from '../../model/bands';
import { BANDS, type Band } from '../../model/climate';
import type { RunContext } from '../types';
import { anyAdopted, lever } from '../define';
import { gridAt, hasSectors } from '../energy/model';
import type { LeverModule } from '../types';
import { practicesSpec } from './spec';
import { PRACTICES, type PracticeId } from './data';
import { electricityShare, gridAddBack, gridPath, practiceCutsOf, practicesKey } from './model';

const ID = 'practices';
const KEYS: Record<PracticeId, string> = {
  feedAdditives: 'fa',
  breedingAndFeed: 'bf',
  manureManagement: 'mm',
  riceWater: 'rw',
  nitrogenEfficiency: 'ne',
  farmEnergy: 'fe',
};
const LEVERS = PRACTICES.map((id) => lever(ID, id, KEYS[id]));

declare module '../../model/api' {
  interface CountryResult {
    /**
     * kg of the grid's CO₂ a year that the electricity Clean farm energy switches to draws on
     * today's grid, by band; with the lever only.
     */
    farmGridCo2?: number;
    farmGridCo2P05?: number;
    farmGridCo2P95?: number;
  }
}

const GRID_FIELDS = {
  median: 'farmGridCo2',
  p05: 'farmGridCo2P05',
  p95: 'farmGridCo2P95',
} as const satisfies Record<Band, string>;

/** The world grid's kg of CO₂ per kWh in the current year: the SSP's, or FAOSTAT's without it. */
const gridNow = ({ prepared, options, currentYear }: RunContext): number =>
  hasSectors(prepared.data.sectors)
    ? gridAt(prepared.data.sectors, options.ssp, currentYear)
    : (prepared.data.practices.farmEnergy?.electrified?.kgCo2PerKwh ?? 0);

/** Farm practices that cut emissions at their source, one share of each item's intensity. */
export const practices: LeverModule = {
  ...practicesSpec,
  hooks: {
    grid: (ctx) => {
      const { prepared, options } = ctx;
      const sectors = prepared.data.sectors;
      const now = gridNow(ctx);
      return hasSectors(sectors) && now > 0
        ? {
            share: (pc) => electricityShare(pc, prepared, options.scope),
            ratio: (year) => gridAt(sectors, options.ssp, year) / now,
          }
        : null;
    },
    intensityKey: (ctx) => practicesKey(ctx.options.scope, ctx.adoption, gridNow(ctx)),
    intensity: (ctx) => {
      const { prepared, options, adoption } = ctx;
      const grid = gridNow(ctx);
      const key = practicesKey(options.scope, adoption, grid);
      return anyAdopted(adoption, LEVERS)
        ? (pc, band) => practiceCutsOf(pc, prepared, options.scope, adoption, grid, key)[band]
        : null;
    },
    country: (ctx) => {
      const { prepared, options, adoption } = ctx;
      const grid = gridNow(ctx);
      return adoption('farmEnergy') > 0 && hasSectors(prepared.data.sectors) && grid > 0
        ? ({ pc, stages }) => {
            const last = stages[stages.length - 1]?.change;
            const kg = gridAddBack(pc, prepared, options.scope, adoption, last, grid);
            return {
              result: Object.fromEntries(BANDS.map((band) => [GRID_FIELDS[band], kg[band]])),
            };
          }
        : null;
    },
    world: (ctx, w) => {
      const { prepared, options } = ctx;
      const sectors = prepared.data.sectors;
      const grid = gridNow(ctx);
      return hasSectors(sectors) && grid > 0 && w.countries.some((c) => c.farmGridCo2 !== undefined)
        ? {
            extraEmissions: bandRecord((band) =>
              gridPath(
                w.countries.reduce((s, c) => s + (c[GRID_FIELDS[band]] ?? 0), 0),
                w.years.map((y) => gridAt(sectors, options.ssp, y) / grid),
                w.years,
                w.baselineScale,
                w.shareAt,
              ),
            ),
          }
        : {};
    },
  },
};
