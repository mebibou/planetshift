import { lever } from '../define';
import type { LeverSpec } from '../types';
import { EMPTY_BREAKDOWN, EMPTY_PRACTICES, PRACTICES, type PracticeId } from './data';

const ID = 'practices';
const KEYS: Record<PracticeId, string> = {
  feedAdditives: 'fa',
  breedingAndFeed: 'bf',
  manureManagement: 'mm',
  riceWater: 'rw',
  nitrogenEfficiency: 'ne',
  farmEnergy: 'fe',
};
const LEVERS = PRACTICES.map((id) => lever(ID, id, KEYS[id]));

/** Farm practices that cut emissions at their source, one share of each item's intensity. */
export const practicesSpec: LeverSpec = {
  id: ID,
  family: 'practices',
  farm: true,
  cause: 'agriculture',
  foods: 'groups',
  levers: LEVERS,
  options: [],
  files: [
    { name: 'breakdown', empty: EMPTY_BREAKDOWN },
    { name: 'practices', empty: EMPTY_PRACTICES },
  ],
  available: (data, id) => data.practices[id as PracticeId] !== undefined,
  ui: { section: 'levers' },
  methodology: { page: 'practices' },
};
