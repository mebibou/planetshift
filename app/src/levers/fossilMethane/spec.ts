import { lever } from '../define';
import type { LeverSpec } from '../types';
import {
  EMPTY_FOSSIL_METHANE,
  FOSSIL_METHANE_LEVERS,
  hasFossilMethane,
  type FossilMethaneLever,
} from './data';

const ID = 'fossilMethane';
const KEYS: Record<FossilMethaneLever, string> = { oilGasMethane: 'ogm', coalMineMethane: 'cmm' };

/**
 * The methane leaked producing oil, gas and coal; not farming. It cuts the scenario's leaks and
 * the methane per kg of fuel the energy and industry levers avoid, so it interacts with them.
 */
export const fossilMethaneSpec: LeverSpec = {
  id: ID,
  family: 'fossilMethane',
  farm: false,
  cause: 'fossilIndustry',
  levers: FOSSIL_METHANE_LEVERS.map((id) => lever(ID, id, KEYS[id])),
  options: [],
  files: [{ name: 'fossilmethane', empty: EMPTY_FOSSIL_METHANE }],
  available: (data) => hasFossilMethane(data.fossilmethane),
  ui: { section: 'levers' },
  methodology: { page: 'leaks' },
};
