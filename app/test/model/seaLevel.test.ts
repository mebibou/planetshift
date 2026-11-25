import { describe, expect, it } from 'vitest';
import type { SeaLevel } from '../../src/data/types';
import { DEFAULT_OPTIONS } from '../../src/model/api';
import { runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { rise, seaLevel2100, seaLevelPaths } from '../../src/model/seaLevel';
import { CURRENT_YEAR, loadFixtures } from './fixtures';

const SEA: SeaLevel = {
  mmPerYearPerDegree: { median: 4, low: 3, high: 6 },
  balanceTemperature: { median: 0.4, low: 0.45, high: 0.35 },
};
const YEARS = Array.from({ length: 2100 - 1990 + 1 }, (_, i) => 1990 + i);
const warming = (perYear: number) => YEARS.map((y) => 1 + perYear * (y - 1990));

describe('sea-level rise', () => {
  it('is zero on average over 1995–2014', () => {
    const h = rise(YEARS, warming(0.02), 4, 0.4);
    const base = h.slice(5, 25);
    expect(base.reduce((a, b) => a + b, 0) / base.length).toBeCloseTo(0, 12);
  });

  it('rises by the rate times the warming above the balance temperature each year', () => {
    const h = rise(
      YEARS,
      YEARS.map(() => 1.4),
      4,
      0.4,
    );
    expect((h[50] as number) - (h[49] as number)).toBeCloseTo(0.004, 12);
  });

  it('takes each end of the likely range from its own fit, and stops in 2100', () => {
    const paths = seaLevelPaths(SEA, [...warming(0.02), 9, 9], warming(0.01), 1990);
    expect(paths.years.at(-1)).toBe(2100);
    expect(paths.baseline.low).toEqual(rise(YEARS, warming(0.02), 3, 0.45));
    expect(paths.baseline.high).toEqual(rise(YEARS, warming(0.02), 6, 0.35));
  });

  it('avoids by 2100 the gap between the paths, the rate times the warming avoided', () => {
    const paths = seaLevelPaths(
      SEA,
      YEARS.map(() => 1.5),
      YEARS.map((y) => (y > 2020 ? 1.4 : 1.5)),
      1990,
    );
    const figure = seaLevel2100(paths);
    // 0.1 °C less over 2021–2100, each year counted at its middle: 79.5 years.
    expect(figure.avoided.median).toBeCloseTo((4 * 0.1 * 79.5) / 1000, 9);
    expect(figure.avoided.low).toBeCloseTo((3 * 0.1 * 79.5) / 1000, 9);
    expect(figure.baseline.median).toBe(paths.baseline.median.at(-1));
  });

  it('grows with the warming a lever avoids, and is absent without the data', () => {
    const data = loadFixtures();
    const withSea = { ...data, climate: { ...data.climate, seaLevel: SEA } };
    const run = (levers: Record<string, number>) =>
      runScenario(withSea, { ...BASE_SCENARIO, levers }, DEFAULT_OPTIONS, CURRENT_YEAR).summary
        .seaLevel2100;
    expect(run({})?.avoided.median).toBeCloseTo(0, 6);
    expect(run({ electricCars: 1 })?.avoided.median).toBeGreaterThan(0);
    const plain = runScenario(data, BASE_SCENARIO, DEFAULT_OPTIONS, CURRENT_YEAR);
    expect(plain.seaLevel).toBeUndefined();
    expect(plain.summary.seaLevel2100).toBeUndefined();
  });
});
