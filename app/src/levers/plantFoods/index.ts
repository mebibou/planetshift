import type { LeverModule } from '../types';
import { PLANT_FOODS } from './data';
import { swappedUse } from './model';
import { plantFoodsSpec } from './spec';

/**
 * Plant foods replaced in what people eat once the diet has shifted: a production step before
 * less waste, so the food no longer wasted is the swapped one.
 */
export const plantFoods: LeverModule = {
  ...plantFoodsSpec,
  hooks: {
    demand: ({ prepared, adoption }) => {
      const shares = PLANT_FOODS.map((f) => adoption(f));
      return shares.some((s) => s > 0)
        ? (pc, food) => swappedUse(pc, food, shares, prepared)
        : null;
    },
  },
};
