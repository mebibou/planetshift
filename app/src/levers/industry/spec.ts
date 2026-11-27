import { hasSectors } from '../energy/data';
import { lever } from '../define';
import type { LeverSpec } from '../types';
import { EMPTY_INDUSTRY } from './data';
import { ACID_N2O_LEVER, EMPTY_ACID_N2O, hasAcidN2o } from './acidN2o';
import { hasIndustry, INDUSTRY_LEVERS, type IndustryLever } from './data';

const ID = 'industry';
const KEYS: Record<IndustryLever, string> = {
  efficientBuildings: 'eb',
  cleanHeating: 'ch',
  cleanIndustry: 'ci',
  otherIndustry: 'oi',
};
const LEVERS = [
  ...INDUSTRY_LEVERS.map((id) => lever(ID, id, KEYS[id])),
  lever(ID, ACID_N2O_LEVER, 'an'),
];

/**
 * The direct fossil CO₂ of buildings' heating and of industry, with the methane and air
 * pollution that come with it; not farming. Its levers draw on the grid the energy module's renewable
 * electricity leaves, from sectors.json, and read coemissions.json, which the energy module loads.
 */
export const industrySpec: LeverSpec = {
  id: ID,
  family: 'industry',
  farm: false,
  cause: 'fossilIndustry',
  levers: LEVERS,
  options: [],
  files: [
    { name: 'industry', empty: EMPTY_INDUSTRY },
    { name: 'acidn2o', empty: EMPTY_ACID_N2O },
  ],
  available: (data, id) =>
    id === ACID_N2O_LEVER
      ? hasAcidN2o(data.acidn2o)
      : hasIndustry(data.industry) && hasSectors(data.sectors),
  ui: { section: 'levers' },
  methodology: { page: 'industry' },
};
