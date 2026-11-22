import { bandRecord } from '../../model/bands';
import {
  airPollutionPaths,
  airPollutionWarming,
  hasCoEmissions,
  type CoYear,
} from '../energy/coemissions';
import { forcingResponseOf, hasSectors } from '../energy/model';
import { anyAdopted, lever } from '../define';
import type { LeverModule } from '../types';
import { EMPTY_INDUSTRY } from './data';
import { hasIndustry, INDUSTRY_LEVERS, industryPaths, type IndustryLever } from './model';

const ID = 'industry';
const KEYS: Record<IndustryLever, string> = { cleanHeating: 'ch', cleanIndustry: 'ci' };
const LEVERS = INDUSTRY_LEVERS.map((id) => lever(ID, id, KEYS[id]));

/**
 * The direct fossil CO₂ of buildings' heating and of steel and cement, with the methane and air
 * pollution that come with it; not farming. Both draw on the grid the energy module's renewable
 * electricity leaves, from sectors.json, and read coemissions.json, which the energy module loads.
 */
export const industry: LeverModule = {
  id: ID,
  family: 'industry',
  farm: false,
  cause: 'fossilIndustry',
  levers: LEVERS,
  options: [],
  files: [{ name: 'industry', empty: EMPTY_INDUSTRY }],
  available: (data) => hasIndustry(data.industry) && hasSectors(data.sectors),
  hooks: {
    world: ({ prepared, options, adoption, currentYear }, { years, tYears, shareAt }) => {
      const { industry, sectors, coemissions, climate } = prepared.data;
      const paths = bandRecord((band) =>
        industryPaths(industry, sectors, coemissions, adoption, options.ssp, band, years, shareAt),
      );
      return {
        extraEmissions: bandRecord((band) =>
          paths[band].co2.map((co2, i) => ({
            co2,
            ch4: (paths[band].co[i] as CoYear).change.ch4,
            n2o: 0,
          })),
        ),
        warmingByCause:
          anyAdopted(adoption, LEVERS) && hasCoEmissions(coemissions)
            ? {
                airPollution: bandRecord((band) =>
                  airPollutionWarming(
                    airPollutionPaths(coemissions, options.ssp, band, years, paths[band].co),
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
  ui: { section: 'levers' },
  methodology: { page: 'industry' },
};
