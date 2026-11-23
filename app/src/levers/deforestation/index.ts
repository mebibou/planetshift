import { sum } from '../../model/util';
import { lever } from '../define';
import type { LeverModule } from '../types';
import { EMPTY_DEFORESTATION } from './data';
import { clearedAreaOf, clearingParts, deforestationOf } from './model';

const ID = 'deforestation';

/**
 * Forest cleared for farming: it follows the production of the items it serves at every step,
 * the lever at 0 included, and the lever stops a share of what is left.
 */
export const deforestation: LeverModule = {
  id: ID,
  family: 'deforestation',
  farm: true,
  cause: 'landUse',
  levers: [lever(ID, 'deforestation', 'df')],
  options: [],
  files: [{ name: 'deforestation', empty: EMPTY_DEFORESTATION }],
  available: (data) => Object.keys(data.deforestation.byCountry).length > 0,
  hooks: {
    country: ({ prepared, adoption }) => {
      const share = adoption('deforestation');
      return ({ pc, stages }) => {
        const changes = stages.map((s) => s.change);
        const parts = clearingParts(deforestationOf(pc, prepared), changes, pc.emitting, share);
        const area = clearingParts(clearedAreaOf(pc, prepared), changes, pc.emitting, share);
        const total = (p: typeof parts) =>
          [...p.steps, p.lever, p.leverJoint].reduce((a, b) => a + b);
        return {
          co2: {
            ...Object.fromEntries(stages.map((s, k) => [s.family, parts.steps[k] as number])),
            [ID]: parts.lever,
          },
          jointCo2: { [ID]: parts.leverJoint },
          result: {
            deforestationCo2: parts.before,
            deforestationChange: total(parts),
            deforestationHa: area.before,
            deforestationHaChange: total(area),
          },
        };
      };
    },
    world: (_, { countries }) => ({
      summary: {
        deforestationCo2: {
          before: sum(countries.map((c) => c.deforestationCo2)),
          avoided: -sum(countries.map((c) => c.deforestationChange)),
        },
      },
    }),
  },
  ui: {
    section: 'levers',
    stat: ({ summary: s }, _, __, f) => {
      const { before, avoided } = s.deforestationCo2;
      return Math.abs(avoided) > 0
        ? {
            label: f.t(`levers.${ID}.summary.${avoided < 0 ? 'added' : 'avoided'}`),
            value: f.mass(Math.abs(avoided)),
            detail: f.t(`levers.${ID}.summary.detail`, {
              share: f.percent(before > 0 ? Math.abs(avoided) / before : 0, 0),
            }),
            className: 'stat-deforestation',
          }
        : null;
    },
  },
  methodology: { page: 'deforestation' },
};
