import { lever } from '../define';
import type { LeverSpec } from '../types';
import { EMPTY_WASTE_METHANE, hasWasteMethane, type WasteMethaneLever } from './data';

const ID = 'wasteMethane';
const KEYS: Record<WasteMethaneLever, string> = { landfills: 'lf', wastewater: 'ww' };

/**
 * Landfill gas captured, organic waste kept out of landfills and wastewater treated, on the
 * waste methane the food levers leave: a farm family in the breakdown, as it acts on what the
 * production steps leave.
 */
export const wasteMethaneSpec: LeverSpec = {
  id: ID,
  family: 'wasteMethane',
  farm: true,
  cause: 'waste',
  levers: (['landfills', 'wastewater'] as const).map((id) => lever(ID, id, KEYS[id])),
  options: [],
  files: [{ name: 'wastemethane', empty: EMPTY_WASTE_METHANE }],
  available: (data) => hasWasteMethane(data.wastemethane),
  ui: { section: 'levers' },
  methodology: { page: 'landfills' },
};
