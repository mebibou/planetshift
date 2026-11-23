import { bandRecord } from '../../model/bands';
import { addLand, uptakeAsEmissions } from '../../model/land';
import { lever } from '../define';
import type { LeverModule } from '../types';
import { EMPTY_REMOVALS, REMOVALS, type RemovalId } from './data';
import { removalPaths } from './model';

const ID = 'removals';
const KEYS: Record<RemovalId, string> = {
  coverCrops: 'cc',
  agroforestry: 'af',
  biochar: 'bc',
  enhancedWeathering: 'ew',
};

/** Carbon stored in farm soils and trees on part of the farmland left once the shift is complete. */
export const removals: LeverModule = {
  id: ID,
  family: 'removals',
  farm: true,
  cause: 'landUse',
  levers: REMOVALS.map((id) => lever(ID, id, KEYS[id])),
  options: [],
  files: [{ name: 'removals', empty: EMPTY_REMOVALS }],
  available: (data, id) => data.removals[id as RemovalId] !== undefined,
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
  ui: {
    section: 'levers',
    stat: ({ summary: s }, _, completeYear, f) =>
      s.removalsCo2.median > 0
        ? {
            label: f.t(`levers.${ID}.summary.title`, { year: completeYear }),
            value: f.mass(s.removalsCo2.median),
            detail: f.t(`levers.${ID}.summary.detail`, {
              low: f.mass(Math.min(s.removalsCo2.p05, s.removalsCo2.p95)),
              high: f.mass(Math.max(s.removalsCo2.p05, s.removalsCo2.p95)),
            }),
            className: 'stat-removals',
          }
        : null,
  },
  methodology: { page: 'removals' },
};
