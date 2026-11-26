import { GWP100 } from '../../model/api';
import { bandRecord } from '../../model/bands';
import { gasVector } from '../../model/util';
import type { LeverModule, RunContext, WorldContext, WorldPart } from '../types';
import { hasHfc, HFC_LEVER, type HfcData } from './data';
import { co2eGap, hfcCut, hfcCuts, hfcPath } from './model';
import { hfcSpec } from './spec';

const partOf = (
  file: HfcData,
  { options, adoption }: RunContext,
  { countries, years, shareAt, baselineScale }: WorldContext,
): WorldPart => {
  const cut = (y: number) => hfcCut(file, adoption(HFC_LEVER), shareAt(y));
  const foodNow = countries.reduce((t, c) => t + (c.chainChange?.hfc ?? 0), 0);
  const cuts = hfcCuts(file, options.ssp, years, cut);
  const path = hfcPath(
    file,
    cuts,
    years,
    cut,
    (y) => foodNow * shareAt(y) * baselineScale('hfc', y),
  );
  return {
    extraEmissions: bandRecord(() => path.map((v) => gasVector((g) => (g === 'hfc' ? v : 0)))),
    co2eAdjustment: co2eGap(file, cuts, GWP100.hfc),
  };
};

/**
 * The HFC phase-down. Its world hook cuts every HFC of the scenario, carried as the HFC-134a
 * stream with the same forcing, less what the food levers already took off the cold chain's
 * refrigerants.
 */
export const hfc: LeverModule = {
  ...hfcSpec,
  hooks: {
    world: (ctx, w) => {
      const file = ctx.prepared.data.hfc;
      return hasHfc(file) && ctx.adoption(HFC_LEVER) > 0 ? partOf(file, ctx, w) : {};
    },
  },
};
