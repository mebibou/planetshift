import { describe, expect, it } from 'vitest';
import { run, w2100 } from '../../../test/levers';
import type { ScenarioResult } from '../../model/api';
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
  it('no lever, no change, with permafrost on', () =>
    expect(w2100(run({}, { permafrost: 'on' }))).toBe(0));
});
