import { bandRecord } from '../../model/bands';
import { addLand, uptakeAsEmissions } from '../../model/land';
import type { LeverModule } from '../types';
import { removalsSpec } from './spec';
import { removalPaths } from './model';

/** Carbon stored in farm soils and trees on part of the farmland left once the shift is complete. */
export const removals: LeverModule = {
  ...removalsSpec,
  hooks: {
    world: ({ prepared, adoption }, { countries, years, shareAt, completeIndex }) => {
      const paths = removalPaths(
        prepared.data.removals,
        adoption,
        countries.map((c) => ({ iso3: c.iso3, land: addLand(c.land, c.landChange) })),
        years,
        shareAt,
      );
      return {
        extraEmissions: bandRecord((band) => uptakeAsEmissions(paths[band])),
        summary: { removalsCo2: bandRecord((band) => paths[band][completeIndex] ?? 0) },
      };
    },
  },
};
