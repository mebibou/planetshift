import { lever } from '../define';
import type { LeverSpec } from '../types';
import { EMPTY_DEFORESTATION } from './data';

const ID = 'deforestation';
const REWETTING = 'peatRewetting';

const hasAny = (byCountry: Record<string, unknown> | undefined): boolean =>
  Object.keys(byCountry ?? {}).length > 0;

/**
 * Forest cleared for farming: it follows the production of the items it serves at every step,
 * the lever at 0 included, and the lever stops a share of what is left. The peat rewetting lever
 * rewets a share of the drained organic soils under farming.
 */
export const deforestationSpec: LeverSpec = {
  id: ID,
  family: 'deforestation',
  farm: true,
  cause: 'landUse',
  levers: [lever(ID, 'deforestation', 'df'), lever(ID, REWETTING, 'pr')],
  options: [],
  files: [{ name: 'deforestation', empty: EMPTY_DEFORESTATION }],
  available: (data, leverId) =>
    hasAny(
      leverId === REWETTING ? data.deforestation.drainedByCountry : data.deforestation.byCountry,
    ),
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
