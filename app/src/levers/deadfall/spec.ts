import { option } from '../define';
import type { LeverSpec } from '../types';
import { EMPTY_DEADFALL } from './data';

const ID = 'deadfall';

/**
 * Carbon that large fish left uncaught sink to the deep ocean: an option counted in the families
 * that change the catch, the diet and less waste.
 */
export const deadfallSpec: LeverSpec = {
  id: ID,
  farm: true,
  cause: 'agriculture',
  levers: [],
  options: [option(ID, 'deadfall', 'deadfall', ['off', 'on'])],
  files: [{ name: 'deadfall', empty: EMPTY_DEADFALL }],
  ui: {},
  methodology: { coveredBy: 'seafood' },
};
