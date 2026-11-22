import type { Scenario } from './api';

/** The controls before the reader moves any: no shift, no lever. */
export const BASE_SCENARIO: Scenario = {
  shift: 0,
  groupShifts: {},
  basis: 'protein',
  replacement: 'current',
  rampEnd: 2035,
  where: 'world',
  levers: {},
};
