import { describe, expect, it } from 'vitest';
import { FAMILIES, MODULES } from '../../src/levers/registry';
import { DEFAULT_OPTIONS, type Options, type Scenario } from '../../src/model/api';
import { shapley } from '../../src/model/attribution';
import { runScenario } from '../../src/model/run';
import { CURRENT_YEAR } from './fixtures';
import { loadRealData } from './realData';
import { sampleById } from './samples';

/** A game with interactions: a and b together are worth more than apart, c adds on its own. */
const worth = (coalition: readonly string[]): number[] => {
  const has = (p: string) => coalition.includes(p);
  return [
    (has('a') ? 2 : 0) + (has('b') ? 1 : 0) + (has('a') && has('b') ? 3 : 0) + (has('c') ? 5 : 0),
  ];
};

describe('Shapley values', () => {
  it('add up to the worth of all the players', () => {
    const values = shapley(['a', 'b', 'c'], worth);
    expect([...values.values()].reduce((s, v) => s + (v[0] as number), 0)).toBeCloseTo(11, 12);
  });
  it('share an interaction equally and leave a lone effect to its player', () => {
    const values = shapley(['a', 'b', 'c'], worth);
    expect(values.get('a')?.[0]).toBeCloseTo(3.5, 12);
    expect(values.get('b')?.[0]).toBeCloseTo(2.5, 12);
    expect(values.get('c')?.[0]).toBeCloseTo(5, 12);
  });
  it('do not depend on the order the players are listed in', () => {
    const players = ['a', 'b', 'c', 'd'];
    const game = (coalition: readonly string[]) => [
      coalition.length ** 2 + (coalition.includes('d') ? 1 : 0),
      coalition.includes('a') && coalition.includes('d') ? 4 : 0,
    ];
    const once = shapley(players, game);
    [
      ['d', 'c', 'b', 'a'],
      ['b', 'd', 'a', 'c'],
    ].forEach((order) => {
      const again = shapley(order, game);
      players.forEach((p) =>
        (once.get(p) as number[]).forEach((v, k) =>
          expect(again.get(p)?.[k], `${p} ${k}`).toBeCloseTo(v, 12),
        ),
      );
    });
  });
  it('give nothing to a player that adds nothing', () => {
    const values = shapley(['a', 'z'], (c) => [c.includes('a') ? 1 : 0]);
    expect(values.get('z')?.[0]).toBe(0);
  });
});

const real = loadRealData();

/**
 * The families' Shapley values over full runs, each family on or off, and the summary of the run
 * with every family on, on `data`.
 */
const breakdownAgainstShapley = (data: NonNullable<typeof real>) => {
  const sample = sampleById('everything').scenario;
  const scenario = {
    ...sample,
    levers: {
      ...sample.levers,
      cleanHeating: 0.5,
      cleanIndustry: 0.5,
      oilGasMethane: 0.5,
      coalMineMethane: 0.5,
    },
  };
  const run = (s: Scenario, o: Partial<Options>) =>
    runScenario(data, s, { ...DEFAULT_OPTIONS, permafrost: 'off', ...o }, CURRENT_YEAR).summary;
  const familyOfLever = (id: string) =>
    MODULES.find((m) => m.levers.some((l) => l.id === id))?.family ?? '';
  const on = run(scenario, { regrowth: 'natural' });
  const exact = shapley(FAMILIES, (coalition) => {
    const r = run(
      {
        ...scenario,
        shift: coalition.includes('diet') ? scenario.shift : 0,
        levers: Object.fromEntries(
          Object.entries(scenario.levers).filter(([id]) => coalition.includes(familyOfLever(id))),
        ),
      },
      { regrowth: coalition.includes('regrowth') ? 'natural' : 'none' },
    );
    return [r.avoidedWarming2050.median, r.avoidedWarming2100.median];
  });
  return { on, exact };
};

describe.skipIf(real === null)('the breakdown on the real data', () => {
  it('equals the Shapley values of full runs with each family on or off, on pulse responses', () => {
    const pulses = { ...(real as NonNullable<typeof real>), fair: undefined };
    const { on, exact } = breakdownAgainstShapley(pulses);
    FAMILIES.forEach((f) => {
      const [w50, w100] = exact.get(f) as number[];
      expect(on.byFamily.avoidedWarming2050[f], f).toBeCloseTo(w50 as number, 9);
      expect(on.byFamily.avoidedWarming2100[f], f).toBeCloseTo(w100 as number, 9);
    });
  });

  it.skipIf(!real?.fair)(
    'shares FaIR’s total out within 0.02 °C or 10% of the Shapley values of full FaIR runs',
    () => {
      const { on, exact } = breakdownAgainstShapley(real as NonNullable<typeof real>);
      const totals = [on.avoidedWarming2050.median, on.avoidedWarming2100.median];
      FAMILIES.forEach((f) => {
        const shares = [on.byFamily.avoidedWarming2050[f], on.byFamily.avoidedWarming2100[f]];
        (exact.get(f) as number[]).forEach((w, h) => {
          const error = Math.abs((shares[h] as number) - w);
          const allowed = Math.max(0.02, 0.1 * Math.abs(totals[h] as number));
          expect(error, `${f} ${h}`).toBeLessThan(allowed);
        });
      });
    },
  );
});
