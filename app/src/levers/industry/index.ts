import { departs, departuresOf } from '../../config';
import { bandRecord } from '../../model/bands';
import {
  airPollutionPaths,
  airPollutionWarming,
  coemissionsOf,
  hasCoEmissions,
  coGases,
} from '../energy/coemissions';
import { forcingResponseOf } from '../energy/model';
import { anyAdopted, lever } from '../define';
import type { LeverModule } from '../types';
import { industrySpec } from './spec';
import { ACID_N2O_LEVER, acidN2oPath, withAcidN2o } from './acidN2o';
import { leaksOf } from '../fossilMethane/model';
import { INDUSTRY_LEVERS, industryPaths, type IndustryLever } from './model';

const ID = 'industry';
const KEYS: Record<IndustryLever, string> = {
  efficientBuildings: 'eb',
  cleanHeating: 'ch',
  cleanIndustry: 'ci',
};
const LEVERS = INDUSTRY_LEVERS.map((id) => lever(ID, id, KEYS[id]));

/**
 * The direct fossil CO₂ of buildings' heating and of steel, cement and chemicals, with the methane and air
 * pollution that come with it; not farming. Both draw on the grid the energy module's renewable
 * electricity leaves, from sectors.json, and read coemissions.json, which the energy module loads.
 */
export const industry: LeverModule = {
  ...industrySpec,
  hooks: {
    world: ({ prepared, options, adoption, currentYear }, { years, tYears, shareAt }) => {
      const { industry, sectors, climate } = prepared.data;
      const coemissions = coemissionsOf(prepared.data);
      const paths = bandRecord((band) =>
        industryPaths(
          industry,
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
      const acid = acidN2oPath(
        prepared.data.acidn2o,
        adoption(ACID_N2O_LEVER),
        options.ssp,
        years,
        shareAt,
      );
      return {
        extraEmissions: bandRecord((band) =>
          withAcidN2o(
            coGases(paths[band].co2, paths[band].co, departs(prepared.data, 'fossilMethaneCo2')),
            acid,
          ),
        ),
        warmingByCause:
          anyAdopted(adoption, LEVERS) && hasCoEmissions(coemissions)
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
