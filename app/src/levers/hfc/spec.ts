import { lever } from '../define';
import type { LeverSpec } from '../types';
import { EMPTY_HFC, hasHfc, HFC_LEVER } from './data';

const ID = 'hfc';

/**
 * The HFC phase-down: every HFC of the scenario cut, the cold chain's refrigerants among them. A
 * farm family in the breakdown, as it cuts what the food levers leave of those refrigerants.
 */
export const hfcSpec: LeverSpec = {
  id: ID,
  family: 'hfc',
  farm: true,
  cause: 'other',
  levers: [lever(ID, HFC_LEVER, 'hfc')],
  options: [],
  files: [{ name: 'hfc', empty: EMPTY_HFC }],
  available: (data) => hasHfc(data.hfc),
  ui: { section: 'levers' },
  methodology: { page: 'hfc' },
};
