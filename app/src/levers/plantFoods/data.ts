import type { Item, ModelData } from '../../data/types';

/**
 * The plant foods a reader can replace, each a lever, picked for their emissions and clearing per
 * calorie against their substitutes' (see docs/methodology/en/shift.md).
 */
export const PLANT_FOODS = ['rice', 'palmOil'] as const;
export type PlantFood = (typeof PLANT_FOODS)[number];

const PALM_OILS = new Set(['2576', '2577']);
const OTHER_VEGETABLE_OILS = new Set([
  '2571',
  '2572',
  '2573',
  '2574',
  '2575',
  '2578',
  '2579',
  '2580',
  '2581',
  '2582',
  '2586',
]);

/** A plant food's items, and the items that take its calories, by today's mix of them. */
export interface PlantSwap {
  food: (item: Item) => boolean;
  substitute: (item: Item) => boolean;
}

export const PLANT_SWAPS: Record<PlantFood, PlantSwap> = {
  rice: { food: (i) => i.group === 'rice', substitute: (i) => i.group === 'cereals' },
  palmOil: {
    food: (i) => PALM_OILS.has(String(i.code)),
    substitute: (i) => OTHER_VEGETABLE_OILS.has(String(i.code)),
  },
};

/** Whether the data has both a plant food and a substitute for it. */
export const hasSwap = (data: ModelData, food: PlantFood): boolean =>
  data.items.some(PLANT_SWAPS[food].food) && data.items.some(PLANT_SWAPS[food].substitute);
