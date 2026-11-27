import { departs, departuresOf } from '../../config';
import { bandRecord } from '../../model/bands';
import {
  airPollutionPaths,
  airPollutionWarming,
  coemissionsOf,
  coGases,
  hasCoEmissions,
} from '../energy/coemissions';
import { forcingResponseOf } from '../energy/model';
import { leaksOf } from '../fossilMethane/model';
import type { LeverModule } from '../types';
import { DAC, DAC_LEVER, dacPaths } from './model';
import { DAC_SUMMARY_YEAR } from './data';
import { dacSpec } from './spec';

/**
 * Direct air capture with the CO₂ stored underground, on its own path rather than the shared
 * ramp; its plants run on the grid that renewable electricity leaves. Not farming.
 */
export const dac: LeverModule = {
  ...dacSpec,
  hooks: {
    world: ({ prepared, options, adoption, currentYear }, { years, tYears, shareAt }) => {
      const { sectors, climate } = prepared.data;
      const coemissions = coemissionsOf(prepared.data);
      const paths = bandRecord((band) =>
        dacPaths(
          DAC,
          sectors,
          coemissions,
          adoption,
          options.ssp,
          band,
          years,
          shareAt,
          leaksOf(prepared.data.fossilmethane, adoption, options.ssp, shareAt),
        ),
      );
      const gases = bandRecord((band) =>
        coGases(paths[band].co2, paths[band].co, departs(prepared.data, 'fossilMethaneCo2')),
      );
      const at = Math.max(0, years.indexOf(DAC_SUMMARY_YEAR));
      return {
        extraEmissions: gases,
        summary: { dacCo2: bandRecord((band) => -(gases[band][at]?.co2 ?? 0)) },
        warmingByCause:
          adoption(DAC_LEVER) > 0 && hasCoEmissions(coemissions)
            ? {
                airPollution: bandRecord((band) =>
                  airPollutionWarming(
                    airPollutionPaths(
                      coemissions,
                      options.ssp,
                      band,
                      years,
                      paths[band].co,
                      departuresOf(prepared.data).noxMethane,
                    ),
                    currentYear,
                    forcingResponseOf(sectors, band),
                    climate,
                    options.climate,
                    band,
                    tYears,
                  ),
                ),
              }
            : {},
      };
    },
  },
};
