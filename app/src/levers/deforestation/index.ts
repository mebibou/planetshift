import { sum } from '../../model/util';
import type { LeverModule } from '../types';
import { deforestationSpec } from './spec';
import {
  clearedAreaOf,
  clearingParts,
  deforestationOf,
  drainedOf,
  rewettedCh4Of,
  rewettedParts,
  type Parts,
} from './model';

const ID = 'deforestation';
const REWETTING = 'peatRewetting';

const total = (p: Parts): number => [...p.steps, p.lever, p.leverJoint].reduce((a, b) => a + b);

/**
 * Forest cleared for farming: it follows the production of the items it serves at every step,
 * the lever at 0 included, and the lever stops a share of what is left. The CO₂ of drained
 * organic soils follows production too; the land production frees is rewetted, and the peat
 * rewetting lever rewets a share of what is left, which then emits methane.
 */
export const deforestation: LeverModule = {
  ...deforestationSpec,
  hooks: {
    country: ({ prepared, adoption }) => {
      const share = adoption(ID);
      const rewet = adoption(REWETTING);
      return ({ pc, stages }) => {
        const changes = stages.map((s) => s.change);
        const parts = clearingParts(deforestationOf(pc, prepared), changes, pc.emitting, share);
        const area = clearingParts(clearedAreaOf(pc, prepared), changes, pc.emitting, share);
        const drained = clearingParts(drainedOf(pc, prepared), changes, pc.emitting, rewet);
        const ch4 = rewettedParts(rewettedCh4Of(pc, prepared), changes, pc.emitting, rewet);
        const byStep = (f: (k: number) => number) =>
          Object.fromEntries(stages.map((s, k) => [s.family, f(k)]));
        return {
          co2: {
            ...byStep((k) => (parts.steps[k] as number) + (drained.steps[k] as number)),
            [ID]: parts.lever + drained.lever,
          },
          jointCo2: { [ID]: parts.leverJoint + drained.leverJoint },
          ch4: { ...byStep((k) => ch4.steps[k] as number), [ID]: ch4.lever },
          jointCh4: { [ID]: ch4.leverJoint },
          result: {
            deforestationCo2: parts.before,
            deforestationChange: total(parts),
            deforestationHa: area.before,
            deforestationHaChange: total(area),
            drainedCo2: drained.before,
            drainedChange: total(drained),
            rewettedCh4: total(ch4),
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
