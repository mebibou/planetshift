import { sum } from '../../model/util';
import type { LeverModule } from '../types';
import { deadfallSpec } from './spec';
import { stepParts, storedPerTonne } from './model';

/**
 * Deadfall of uncaught large fish: each step's change in catch keeps or forgoes the carbon those
 * fish would sink, credited to the step's family and built up as the stocks recover.
 */
export const deadfall: LeverModule = {
  ...deadfallSpec,
  hooks: {
    country: ({ prepared, options }) =>
      options.deadfall === 'on'
        ? ({ pc, stages }) => {
            const parts = stepParts(
              stages.map((s) => s.change),
              storedPerTonne(pc, prepared),
            );
            return {
              buildUp: {
                years: prepared.data.deadfall.buildUpYears,
                co2: Object.fromEntries(stages.map((s, k) => [s.family, parts[k] as number])),
              },
              result: { deadfallCo2: sum(parts) },
            };
          }
        : null,
  },
};
