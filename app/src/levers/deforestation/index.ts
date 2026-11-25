import { sum } from '../../model/util';
import type { LeverModule } from '../types';
import { deforestationSpec } from './spec';
import { clearedAreaOf, clearingParts, deforestationOf, drainedOf } from './model';

const ID = 'deforestation';

/**
 * Forest cleared for farming: it follows the production of the items it serves at every step,
 * the lever at 0 included, and the lever stops a share of what is left. The CO₂ of drained
 * organic soils follows production too, but no lever stops it.
 */
export const deforestation: LeverModule = {
  ...deforestationSpec,
  hooks: {
    country: ({ prepared, adoption }) => {
      const share = adoption('deforestation');
      return ({ pc, stages }) => {
        const changes = stages.map((s) => s.change);
        const parts = clearingParts(deforestationOf(pc, prepared), changes, pc.emitting, share);
        const area = clearingParts(clearedAreaOf(pc, prepared), changes, pc.emitting, share);
        const drained = clearingParts(drainedOf(pc, prepared), changes, pc.emitting, 0);
        const total = (p: typeof parts) =>
          [...p.steps, p.lever, p.leverJoint].reduce((a, b) => a + b);
        return {
          co2: {
            ...Object.fromEntries(
              stages.map((s, k) => [
                s.family,
                (parts.steps[k] as number) + (drained.steps[k] as number),
              ]),
            ),
            [ID]: parts.lever,
          },
          jointCo2: { [ID]: parts.leverJoint },
          result: {
            deforestationCo2: parts.before,
            deforestationChange: total(parts),
            deforestationHa: area.before,
            deforestationHaChange: total(area),
            drainedCo2: drained.before,
            drainedChange: total(drained),
          },
        };
      };
    },
    world: (_, { countries }) => ({
      summary: {
        deforestationCo2: {
          before: sum(countries.map((c) => c.deforestationCo2)),
          avoided: -sum(countries.map((c) => c.deforestationChange)),
        },
      },
    }),
  },
};
