// How long the port takes for 30, 50, 100 and 841 members, one scenario or the batch an
// interaction needs (2^n runs for n acting lever families: the baseline, the scenario and the
// Shapley breakdown's coalitions), 1750–2100 in one go or carried on from 2025. Measured on the
// scenarios `fair_ts_export` writes; skipped without them.

import { describe, expect, it } from 'vitest';
import { loadModel, type Model } from '../../../src/model/fair/calibration';
import { memberOf, runMember, type Member, type MemberState } from '../../../src/model/fair/member';
import { prepareScenario, type ScenarioInput } from '../../../src/model/fair/scenario';
import { exported, readCalibration, readScenario, STEPS } from './exported';

const FROM = 2025 - 1750;
const MEMBERS = [30, 50, 100, 841];
const BATCHES = [1, 2, 8, 32, 256];
/** Batches estimated from the one-run time beyond this, rather than run. */
const LONGEST_MS = 3000;

/** SSP2-4.5 with its CO₂ and methane cut by `share` from 2025, as a lever would. */
const variant = (base: ScenarioInput, share: number): ScenarioInput => ({
  ...base,
  emissions: Object.fromEntries(
    Object.entries(base.emissions).map(([s, v]) => [
      s,
      ['CO2 FFI', 'CH4'].includes(s)
        ? Array.from(v, (x, t) => (t >= FROM ? x * (1 - share) : x))
        : v,
    ]),
  ),
});

const median = (xs: number[]): number =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;

/** Runs `batch` scenarios on every member, from `history` when given. The members are compiled
 * once, as a worker would when it loads the calibration. */
const runBatch = (
  model: Model,
  members: readonly Member[],
  inputs: readonly ScenarioInput[],
  history: readonly MemberState[] | null,
): void => {
  const base = prepareScenario(model, inputs[0] as ScenarioInput, STEPS);
  inputs.forEach((input, i) => {
    const prepared = i === 0 ? base : prepareScenario(model, input, STEPS, base);
    members.forEach((m, k) => runMember(model, m, prepared, history?.[k]));
  });
};

const timed = (f: () => void): number => {
  const t0 = performance.now();
  f();
  return performance.now() - t0;
};

describe.skipIf(!exported)('FaIR port speed', () => {
  it('runs 30 members of one scenario carried on from 2025 within the 30 ms budget', () => {
    const file = readCalibration();
    const ssp245 = readScenario('ssp245');
    const rows = MEMBERS.flatMap((count) => {
      const model = loadModel(
        file,
        Array.from({ length: count }, (_, k) => Math.floor((k * 841) / count)),
      );
      const prepared = prepareScenario(model, ssp245, STEPS);
      const members = model.members.map((p) => memberOf(model, p));
      const history = members.map((m) => runMember(model, m, prepared, undefined, FROM).state);
      return (['1750', '2025'] as const).map((start) => {
        const from = start === '2025' ? history : null;
        const one = median(
          [0, 1, 2, 3, 4].map(() => timed(() => runBatch(model, members, [ssp245], from))),
        );
        const cells = BATCHES.map((batch) => {
          const inputs = Array.from({ length: batch }, (_, i) => variant(ssp245, i / batch));
          const ms =
            one * batch > LONGEST_MS
              ? one * batch
              : timed(() => runBatch(model, members, inputs, from));
          return `${ms.toFixed(1)}${one * batch > LONGEST_MS ? ' (est.)' : ''}`;
        });
        return {
          count,
          start,
          one,
          line: `${count} members from ${start}: ${cells.join(' | ')} ms`,
        };
      });
    });
    console.log(`batch sizes ${BATCHES.join(' | ')}\n${rows.map((r) => r.line).join('\n')}`);
    const quick = rows.find((r) => r.count === 30 && r.start === '2025');
    expect(quick?.one).toBeLessThan(30);
  });
});
