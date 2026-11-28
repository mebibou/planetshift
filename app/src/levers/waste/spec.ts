import { lever } from '../define';
import type { LeverSpec } from '../types';
import { EMPTY_WASTE } from './data';

const ID = 'waste';

/** Less food wasted after shops and lost before them: less to grow for the same meals. */
export const wasteSpec: LeverSpec = {
  id: ID,
  family: 'waste',
  farm: true,
  cause: 'agriculture',
  foods: 'groups',
  levers: [lever(ID, 'foodWaste', 'fw'), lever(ID, 'supplyLosses', 'sl')],
  options: [],
  files: [{ name: 'waste', empty: EMPTY_WASTE }],
  available: (data) => Object.keys(data.waste.byCountry).length > 0,
  ui: { section: 'levers' },
  methodology: { page: 'waste' },
};
