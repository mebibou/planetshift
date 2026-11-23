import { lever } from '../define';
import type { LeverModule } from '../types';
import { EMPTY_WASTE } from './data';
import { countryAvoidedSupply, countryMultipliers, foodWithLessWaste, wasteShareOf } from './model';

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
    supplyChain: ({ adoption }) => {
      const cut = adoption('supplyLosses');
      return cut > 0
        ? {
            multipliers: (pc) => countryMultipliers(pc, cut),
            avoidedLosses: (pc) => countryAvoidedSupply(pc, cut),
          }
        : null;
    },
  },
  ui: { section: 'levers' },
  methodology: { page: 'waste' },
};
