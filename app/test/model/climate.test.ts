import { describe, expect, it } from 'vitest';
import { agtpOf, convolve, warmingFrom } from '../../src/model/climate';
import { ramp } from '../../src/model/timePath';
import { range } from '../../src/model/util';
import { DEFAULT_OPTIONS } from '../../src/model/api';
import { avoidedBand, runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { CURRENT_YEAR, loadFixtures } from './fixtures';

const data = loadFixtures();
const { climate } = data;
const years = range(2020, 2050);

describe('convolution', () => {
  const agtp = agtpOf(climate, 'fair', 'ch4', 'median');
  it('returns the AGTP curve for a unit pulse', () => {
    const t = convolve([1], 2025, agtp, years);
    years.forEach((y, i) => expect(t[i]).toBe(y < 2025 ? 0 : agtp[y - 2025]));
  });
  it('is linear', () => {
    const a = [1e9, 2e9, 0, 5e8];
    const b = [3e8, 0, 1e9, 1e9];
    const ta = convolve(a, 2026, agtp, years);
    const tb = convolve(b, 2026, agtp, years);
    const tab = convolve(
      a.map((x, i) => 2 * x + 3 * (b[i] as number)),
      2026,
      agtp,
      years,
    );
    tab.forEach((v, i) => {
      const expected = 2 * (ta[i] as number) + 3 * (tb[i] as number);
      expect(Math.abs(v - expected)).toBeLessThanOrEqual(Math.abs(expected) * 1e-12);
    });
  });
  it('holds the curve beyond its horizon', () => {
    const short = [1, 2, 3];
    expect(convolve([1], 2000, short, [2010])).toEqual([3]);
  });
  it('sums the gases', () => {
    const t = warmingFrom([{ co2: 1, ch4: 1, n2o: 1 }], 2030, climate, 'fair', 'median', [2040]);
    const expected = (['co2', 'ch4', 'n2o'] as const).reduce(
      (a, g) => a + (agtpOf(climate, 'fair', g, 'median')[10] as number),
      0,
    );
    expect(t[0]).toBeCloseTo(expected, 25);
  });
  it('uses the median for a method without a range', () => {
    expect(agtpOf(climate, 'ar6', 'co2', 'p95')).toEqual(climate.agtp.ar6.co2.median);
  });
});

describe('ramp', () => {
  it('rises linearly from 0 in the current year to 1 at its end, then stays', () => {
    expect(ramp(2026, 2026, 2036)).toBe(0);
    expect(ramp(2031, 2026, 2036)).toBeCloseTo(0.5, 12);
    expect(ramp(2036, 2026, 2036)).toBe(1);
    expect(ramp(2050, 2026, 2036)).toBe(1);
    expect(ramp(2020, 2026, 2036)).toBe(0);
  });
  it('is a step when it ends this year', () => {
    expect(ramp(2026, 2026, 2026)).toBe(1);
  });
});

describe('avoided warming over time', () => {
  it('orders the range and grows with the shift', () => {
    expect(avoidedBand({ median: [-0.02], p05: [-0.01], p95: [-0.03] })).toEqual({
      median: [0.02],
      p05: [0.01],
      p95: [0.03],
    });
    const at2050 = (shift: number) =>
      runScenario(
        data,
        { ...BASE_SCENARIO, shift },
        DEFAULT_OPTIONS,
        CURRENT_YEAR,
      ).temperature.avoided.median.at(-1) ?? 0;
    expect(at2050(0)).toBe(0);
    expect(at2050(0.3)).toBeGreaterThan(at2050(0.1));
    const { summary } = runScenario(
      data,
      { ...BASE_SCENARIO, shift: 0.5 },
      DEFAULT_OPTIONS,
      CURRENT_YEAR,
    );
    expect(summary.avoidedWarming2100.median).toBeGreaterThan(summary.avoidedWarming2050.median);
  });
});
