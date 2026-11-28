import { lever } from '../define';
import type { LeverSpec } from '../types';
import { hasSwap, type PlantFood } from './data';

const ID = 'plantFoods';

/** Rice and palm oil replaced by other cereals and other vegetable oils on the same calories. */
export const plantFoodsSpec: LeverSpec = {
  id: ID,
  family: 'plantFoods',
  farm: true,
  cause: 'agriculture',
  foods: 'levers',
  levers: [lever(ID, 'rice', 'ric'), lever(ID, 'palmOil', 'plm')],
  options: [],
  files: [],
  available: (data, id) => hasSwap(data, id as PlantFood),
  ui: { section: 'levers', meta: 'levers.plantFoods.meta', follows: 'diet' },
  methodology: { coveredBy: 'shift' },
};
