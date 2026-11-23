import { lever } from '../define';
import type { LeverModule } from '../types';
import { EMPTY_WASTE } from './data';
import { foodWithLessWaste, lossChain, wasteShareOf } from './model';

const ID = 'waste';

/** Less food wasted after shops and lost before them: less to grow for the same meals. */
export const waste: LeverModule = {
  id: ID,
  family: 'waste',
  farm: true,
  cause: 'agriculture',
  levers: [lever(ID, 'foodWaste', 'fw'), lever(ID, 'supplyLosses', 'sl')],
  options: [],
  files: [{ name: 'waste', empty: EMPTY_WASTE }],
  available: (data) => Object.keys(data.waste.byCountry).length > 0,
  hooks: {
    demand: ({ prepared, adoption }) => {
      const cut = adoption('foodWaste');
      return cut > 0
        ? (pc, food) => foodWithLessWaste(pc.food, food, wasteShareOf(pc, prepared), cut)
        : null;
    },
    supplyChain: ({ prepared, adoption }) => {
      const cut = adoption('supplyLosses');
      return cut > 0
        ? {
            multipliers: (pc) => lossChain(pc, prepared, cut).multipliers,
            avoidedLosses: (pc) => lossChain(pc, prepared, cut).avoided,
          }
        : null;
    },
  },
  ui: { section: 'levers' },
  methodology: { page: 'waste' },
};
