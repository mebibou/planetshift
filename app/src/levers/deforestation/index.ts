import { sum } from '../../model/util';
import type { LeverModule } from '../types';
import { deforestationSpec } from './spec';
import {
  clearingParts,
  countryClearing,
  relativeChanges,
  rewettedParts,
  type Parts,
} from './model';

const ID = 'deforestation';
const REWETTING = 'peatRewetting';

/** The steps' changes, then the lever's, added in that order. */
const total = (p: Parts): number => {
  let t = 0;
  p.steps.forEach((v, k) => (t = k === 0 ? v : t + v));
  return p.steps.length === 0 ? p.lever + p.leverJoint : t + p.lever + p.leverJoint;
};

/** Each step's value by its family, then the lever's under its own id. */
const byStep = (
  families: readonly string[],
  f: (k: number) => number,
  lever: number,
): Record<string, number> => {
  const out: Record<string, number> = {};
  families.forEach((family, k) => (out[family] = f(k)));
  out[ID] = lever;
  return out;
};

/**
 * Forest cleared for farming: it follows the production of the items it serves at every step,
 * the lever at 0 included, and the lever stops a share of what is left. The CO₂ of drained
 * organic soils, and their N₂O, follow production too; the land production frees is rewetted,
 * and the peat rewetting lever rewets a share of what is left, which then emits methane.
 */
export const deforestation: LeverModule = {
  ...deforestationSpec,
  hooks: {
    country: ({ prepared, adoption }) => {
      const share = adoption(ID);
      const rewet = adoption(REWETTING);
      return ({ pc, stages }) => {
        const c = countryClearing(pc, prepared);
        const changes = stages.map((s) => s.change);
        const families = stages.map((s) => s.family);
        const rel = relativeChanges(changes, pc.emitting, c.items);
        const parts = clearingParts(c.co2, changes, pc.emitting, share, undefined, rel);
        const area = clearingParts(c.area, changes, pc.emitting, share, undefined, rel);
        const drained = clearingParts(c.drained, changes, pc.emitting, rewet, undefined, rel);
        const n2o = clearingParts(c.drainedN2o, changes, pc.emitting, rewet, undefined, rel);
        const ch4 = rewettedParts(c.rewettedCh4, changes, pc.emitting, rewet, rel);
        return {
          co2: byStep(
            families,
            (k) => (parts.steps[k] as number) + (drained.steps[k] as number),
            parts.lever + drained.lever,
          ),
          jointCo2: { [ID]: parts.leverJoint + drained.leverJoint },
          ch4: byStep(families, (k) => ch4.steps[k] as number, ch4.lever),
          jointCh4: { [ID]: ch4.leverJoint },
          n2o: byStep(families, (k) => n2o.steps[k] as number, n2o.lever),
          jointN2o: { [ID]: n2o.leverJoint },
          result: {
            deforestationCo2: parts.before,
            deforestationChange: total(parts),
            deforestationHa: area.before,
            deforestationHaChange: total(area),
            drainedCo2: drained.before,
            drainedChange: total(drained),
            drainedN2o: n2o.before,
            drainedN2oChange: total(n2o),
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
