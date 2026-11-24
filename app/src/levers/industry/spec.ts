import { hasSectors } from '../energy/data';
import { lever } from '../define';
import type { LeverSpec } from '../types';
import { EMPTY_INDUSTRY } from './data';
import { hasIndustry, INDUSTRY_LEVERS, type IndustryLever } from './data';

const ID = 'industry';
const KEYS: Record<IndustryLever, string> = { cleanHeating: 'ch', cleanIndustry: 'ci' };
const LEVERS = INDUSTRY_LEVERS.map((id) => lever(ID, id, KEYS[id]));

/**
 * The direct fossil CO₂ of buildings' heating and of steel, cement and chemicals, with the methane and air
 * pollution that come with it; not farming. Both draw on the grid the energy module's renewable
 * electricity leaves, from sectors.json, and read coemissions.json, which the energy module loads.
 */
export const industrySpec: LeverSpec = {
  id: ID,
  family: 'industry',
  farm: false,
  cause: 'fossilIndustry',
  levers: LEVERS,
  options: [],
  files: [{ name: 'industry', empty: EMPTY_INDUSTRY }],
  available: (data) => hasIndustry(data.industry) && hasSectors(data.sectors),
  ui: { section: 'levers' },
  methodology: { page: 'industry' },
};
