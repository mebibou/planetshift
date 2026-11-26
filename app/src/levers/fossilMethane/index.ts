import { departs } from '../../config';
import { bandRecord } from '../../model/bands';
import type { LeverModule } from '../types';
import { countryLeaks, leakPaths } from './model';
import { fossilMethaneSpec } from './spec';

/**
 * The methane leaked producing oil, gas and coal; not farming. Its world hook cuts the scenario's
 * leaks; the energy and industry modules read its levers for the methane per kg of fuel they
 * avoid. Its country hook gives each country's leaks for the map.
 */
export const fossilMethane: LeverModule = {
  ...fossilMethaneSpec,
  hooks: {
    world: ({ prepared, options, adoption }, { years, shareAt }) => {
      const path = leakPaths(
        prepared.data.fossilmethane,
        adoption,
        options.ssp,
        years,
        shareAt,
        departs(prepared.data, 'fossilMethaneCo2'),
      );
      return { extraEmissions: bandRecord(() => path) };
    },
    country: ({ prepared, adoption }) => {
      const fm = prepared.data.fossilmethane;
      return ({ pc }) => {
        const leaks = countryLeaks(fm, pc.country.iso3, adoption);
        return leaks ? { result: leaks } : {};
      };
    },
  },
};
