import type { ModelData } from '../../data/types';
import type { LeverModule, Stage } from '../types';
import { wasteSpec } from './spec';
import { countryFoodWaste } from './foodWaste';
import { foodWithLessWaste, lossChain, wasteShareOf } from './model';

const foodWasteFields = (fw: ReturnType<typeof countryFoodWaste>) => ({
  foodWaste: fw.before,
  foodWasteChange: fw.change,
});

/** The change in production up to the last step, and how the oilcake follows it. */
const lastStage = (stages: readonly Stage[]): Pick<Stage, 'change' | 'cake'> => {
  const { change, cake } = stages[stages.length - 1] as Stage;
  return { change, cake };
};

/** A country's municipal waste and plastic reaching the ocean, where the files give them. */
const unchangedWaste = (data: ModelData, iso3: string) => {
  const municipal = data.solidwaste?.byCountry[iso3];
  const plastic = data.oceanplastic?.byCountry[iso3];
  return {
    ...(municipal ? { municipalWaste: municipal } : {}),
    ...(plastic === undefined ? {} : { oceanPlastic: plastic }),
  };
};

/**
 * Less food wasted after shops and lost before them: less to grow for the same meals. Its
 * country hook gives the food lost and wasted by stage on the passes that read the diet (not the
 * breakdown's), and the waste no lever changes.
 */
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
    country: ({ prepared, adoption }) => {
      const [wasteCut, lossCut] = [adoption('foodWaste'), adoption('supplyLosses')];
      return ({ pc, food, stages }) => ({
        result: {
          ...(food
            ? foodWasteFields(
                countryFoodWaste(pc, prepared, {
                  dietFood: food,
                  ...lastStage(stages),
                  wasteCut,
                  lossCut,
                }),
              )
            : {}),
          ...unchangedWaste(prepared.data, pc.country.iso3),
        },
      });
    },
  },
};
