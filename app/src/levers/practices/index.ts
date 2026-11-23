import { anyAdopted, lever } from '../define';
import type { LeverModule } from '../types';
import { EMPTY_BREAKDOWN, EMPTY_PRACTICES, PRACTICES, type PracticeId } from './data';
import { practiceCutsOf, practicesKey } from './model';

const ID = 'practices';
const KEYS: Record<PracticeId, string> = {
  feedAdditives: 'fa',
  breedingAndFeed: 'bf',
  manureManagement: 'mm',
  riceWater: 'rw',
  nitrogenEfficiency: 'ne',
  nitrificationInhibitors: 'ni',
  farmEnergy: 'fe',
};
const LEVERS = PRACTICES.map((id) => lever(ID, id, KEYS[id]));

/** Farm practices that cut emissions at their source, one share of each item's intensity. */
export const practices: LeverModule = {
  id: ID,
  family: 'practices',
  farm: true,
  cause: 'agriculture',
  levers: LEVERS,
  options: [],
  files: [
    { name: 'breakdown', empty: EMPTY_BREAKDOWN, deferred: true },
    { name: 'practices', empty: EMPTY_PRACTICES },
  ],
  available: (data, id) => data.practices[id as PracticeId] !== undefined,
  hooks: {
    intensity: ({ prepared, options, adoption }) => {
      const key = practicesKey(options.scope, adoption);
      return anyAdopted(adoption, LEVERS)
        ? (pc, band) => practiceCutsOf(pc, prepared, options.scope, adoption, key)[band]
        : null;
    },
  },
  ui: { section: 'levers' },
  methodology: { page: 'practices' },
};
