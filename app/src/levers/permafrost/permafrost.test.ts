import { describe, expect, it } from 'vitest';
import { run, w2100 } from '../../../test/levers';
import type { ScenarioResult } from '../../model/api';
import { shareFeedback, shareOut } from '../../model/run';
import { carbonRelease, releaseAsGases } from './model';

const baselineIn = (r: ScenarioResult, year: number) =>
  r.temperature.baseline.median[year - r.temperature.years[0]!] as number;

describe('permafrost', () => {
  it('commits carbon on each rise, spread over the release years, nothing back on a fall', () => {
    const temperature = [1, 1.1, 1.3, 1.2, 1.2];
    const release = carbonRelease(temperature, 2000, 2001, 2006, 10, 2);
    expect(release[0]).toBeCloseTo(0);
    expect(release[1]).toBeCloseTo(0.5);
    expect(release[2]).toBeCloseTo(1.5);
    expect(release[3]).toBeCloseTo(1);
    expect(release[4]).toBeCloseTo(0);
    const [gases] = releaseAsGases([12], 0.25);
    expect(gases!.ch4).toBeCloseTo(12 * 0.25 * (16 / 12));
    expect(gases!.co2).toBeCloseTo(12 * 0.75 * (44 / 12));
  });
  it('on warms the baseline, off leaves it as the scenario', () => {
    const on = run({}, { permafrost: 'on' });
    const off = run({}, { permafrost: 'off' });
    expect(baselineIn(on, 2100)).toBeGreaterThan(baselineIn(off, 2100) + 0.01);
    expect(baselineIn(on, 2050)).toBeGreaterThan(baselineIn(off, 2050));
    expect(baselineIn(on, 2000)).toBe(baselineIn(off, 2000));
    const band = on.temperature.baseline;
    expect(band.p95[250]! - band.median[250]!).toBeGreaterThan(
      off.temperature.baseline.p95[250]! - off.temperature.baseline.median[250]!,
    );
  });
  it('a scenario that cools also releases less, so it avoids more with permafrost on', () => {
    const scenario = { levers: { electricCars: 1, renewableElectricity: 1 } };
    const on = run(scenario, { permafrost: 'on' });
    const off = run(scenario, { permafrost: 'off' });
    expect(w2100(on)).toBeGreaterThan(w2100(off));
    expect(w2100(on)).toBeLessThan(w2100(off) * 1.3);
    const s = on.summary;
    const total = Object.values(s.byFamily.avoidedWarming2100).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(s.avoidedWarming2100.median, 9);
  });
  it('shares the change out by the size of each part, bounded when the parts nearly cancel', () => {
    const [fossil, air] = shareOut([-0.01, 0.0099], -0.0005) as [number, number];
    expect(fossil + air).toBeCloseTo(-0.0001 - 0.0005, 15);
    expect(fossil).toBeCloseTo(-0.01 - 0.0005 * (0.01 / 0.0199), 15);
    expect(Math.abs(fossil + 0.01)).toBeLessThanOrEqual(0.0005);
    expect(Math.abs(air - 0.0099)).toBeLessThanOrEqual(0.0005);
    const close = (actual: number[], expected: number[]) =>
      expected.forEach((v, k) => expect(actual[k]).toBeCloseTo(v, 15));
    close(shareOut([0.01, -0.01], 0.002), [0.011, -0.009]);
    close(shareOut([0, 0], 0.002), [0.001, 0.001]);
    const shared = shareFeedback(
      [
        [0, -0.01],
        [0, 0.01],
      ],
      [0, 0.002],
    );
    close(shared[0] as number[], [0, -0.009]);
    close(shared[1] as number[], [0, 0.011]);
  });
  it('the parts by cause add up to the warming avoided with permafrost on', () => {
    const r = run({ shift: 0.3, levers: { electricCars: 1, flyLess: 1 } }, { permafrost: 'on' });
    const causes = Object.values(r.temperature.avoidedByCause);
    r.temperature.avoided.median.forEach((v, i) =>
      expect(causes.reduce((a, c) => a + (c[i] as number), 0)).toBeCloseTo(v, 12),
    );
  });
  it('no lever, no change, with permafrost on', () =>
    expect(w2100(run({}, { permafrost: 'on' }))).toBe(0));
});
