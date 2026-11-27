import { describe, expect, it } from 'vitest';
import { LEVERS } from '../../src/levers/registry';
import { DEFAULT_OPTIONS, type Options } from '../../src/model/api';
import { OPTIONS } from '../../src/model/options';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { prepare } from '../../src/model/prepare';
import { runScenario, startScenario } from '../../src/model/run';
import { SAMPLES } from './samples';
import { CURRENT_YEAR } from './fixtures';
import { loadRealData } from './realData';
import { syntheticData } from './synthetic';

/** The sliders wait for a run's result alone: its breakdown follows in a message of its own. */
describe('performance', () => {
  it('runs 180 countries × 100 items in under 30 ms once prepared', () => {
    const data = syntheticData();
    const t0 = performance.now();
    prepare(data);
    const prepareMs = performance.now() - t0;
    const times = SAMPLES.flatMap((p) =>
      [0, 1, 2].map(() => {
        const start = performance.now();
        startScenario(data, p.scenario, DEFAULT_OPTIONS, CURRENT_YEAR);
        return performance.now() - start;
      }),
    ).sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)] as number;
    console.log(
      `prepare ${prepareMs.toFixed(1)} ms; run median ${median.toFixed(1)} ms, max ${times[times.length - 1]?.toFixed(1)} ms`,
    );
    expect(median).toBeLessThan(30);
  });
});

const real = loadRealData();

describe.skipIf(real === null)('performance on the real data', () => {
  it('runs every sample, levers included, in a median under 20 ms and at most 35 ms once prepared', () => {
    const data = real as NonNullable<typeof real>;
    prepare(data);
    SAMPLES.forEach((p) => runScenario(data, p.scenario, DEFAULT_OPTIONS, CURRENT_YEAR));
    // Samples in turn, so no run reuses the one before it.
    const times = [0, 1, 2]
      .flatMap(() => SAMPLES)
      .map((p) => {
        const start = performance.now();
        startScenario(data, p.scenario, { ...DEFAULT_OPTIONS, ...p.options }, CURRENT_YEAR);
        return performance.now() - start;
      })
      .sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)] as number;
    const max = times[times.length - 1] as number;
    console.log(`real data: run median ${median.toFixed(1)} ms, max ${max.toFixed(1)} ms`);
    expect(median).toBeLessThan(20);
    expect(max).toBeLessThan(35);
  });

  const everything = Object.fromEntries(LEVERS.map((l) => [l.id, 1]));
  const allOptions = Object.fromEntries(
    OPTIONS.map((o) => [o.field, o.values[o.values.length - 1]]),
  ) as unknown as Options;

  it('runs with every lever and every option on within the time budget', () => {
    const data = real as NonNullable<typeof real>;
    prepare(data);
    const scenario = { ...BASE_SCENARIO, shift: 0.5, levers: everything };
    runScenario(data, scenario, allOptions, CURRENT_YEAR);
    const times = [0.5, 0.6, 0.7, 0.8, 0.9].map((share) => {
      const start = performance.now();
      startScenario(
        data,
        { ...scenario, levers: { ...everything, foodWaste: share } },
        allOptions,
        CURRENT_YEAR,
      );
      return performance.now() - start;
    });
    const median = [...times].sort((a, b) => a - b)[2] as number;
    console.log(`real data, everything on: run median ${median.toFixed(1)} ms`);
    expect(median).toBeLessThan(30);
  });
});
