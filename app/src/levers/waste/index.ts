import type { LeverModule } from '../types';
import { wasteSpec } from './spec';
import { foodWithLessWaste, lossChain, wasteShareOf } from './model';

/** Less food wasted after shops and lost before them: less to grow for the same meals. */
export const waste: LeverModule = {
  ...wasteSpec,
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
};
