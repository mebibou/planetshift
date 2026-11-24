import { option } from '../define';
import type { LeverSpec } from '../types';

const ID = 'permafrost';

/** 'on': permafrost releases carbon as the world warms (climate.md), in the baseline and the scenario. */
export type PermafrostOption = 'off' | 'on';

declare module '../../model/api' {
  interface Options {
    permafrost: PermafrostOption;
  }
}

/**
 * Permafrost carbon released as the world warms: an option that warms the baseline, and whose
 * change with the scenario is shared out between the families in proportion to their warming.
 */
export const permafrostSpec: LeverSpec = {
  id: ID,
  departure: 'permafrost',
  levers: [],
  options: [option(ID, 'permafrost', 'pf', ['on', 'off'])],
  files: [],
  ui: {},
  methodology: { coveredBy: 'climate' },
};
