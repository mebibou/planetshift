import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS, type Options, type Scenario } from '../../src/model/api';
import { oilcakeChange, pastureChange, uptakePath } from '../../src/model/land';
import { loadRealData } from './realData';
import { runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { sampleById } from './samples';
import { range } from '../../src/model/util';
import { CURRENT_YEAR, loadFixtures } from './fixtures';

const data = loadFixtures();
const run = (scenario: Partial<Scenario>, options: Partial<Options> = {}) =>
  runScenario(
    data,
    { ...BASE_SCENARIO, ...scenario },
    { ...DEFAULT_OPTIONS, ...options },
    CURRENT_YEAR,
  );
const preset = (id: string) => sampleById(id).scenario;
const co2Difference = (a: ReturnType<typeof run>, b: ReturnType<typeof run>) =>
  a.scenarioEmissions.map((e, i) => (b.scenarioEmissions[i]?.co2 ?? 0) - e.co2);

describe('land', () => {
  it('reports each country’s farmland, and no change without a shift', () => {
    const r = run({ shift: 0 }, { regrowth: 'natural' });
    r.countries.forEach((c) => {
      expect(c.land.cropland).toBeGreaterThan(0);
      expect(c.land.pasture).toBeGreaterThan(0);
      expect(c.landChange.cropland).toBeCloseTo(0, 6);
      expect(c.landChange.pasture).toBeCloseTo(0, 6);
    });
    expect(r.summary.landFreed.cropland).toBeCloseTo(0, 3);
    expect(r.summary.landFreed.pasture).toBeCloseTo(0, 3);
    expect(r.summary.regrowthCo2.median).toBeCloseTo(0, 3);
  });

  it('frees farmland with a shift, pasture most of all', () => {
    const r = run({ shift: 0.5 });
    const { landBefore, landFreed } = r.summary;
    expect(landFreed.pasture).toBeGreaterThan(0);
    expect(landFreed.cropland + landFreed.pasture).toBeGreaterThan(0);
    expect(landFreed.pasture / landBefore.pasture).toBeGreaterThan(
      landFreed.cropland / landBefore.cropland,
    );
    expect(landBefore.pasture).toBeCloseTo(
      r.countries.reduce((a, c) => a + c.land.pasture, 0),
      0,
    );
  });

  it('frees more land with a bigger shift', () => {
    const total = (r: ReturnType<typeof run>) =>
      r.summary.landFreed.cropland + r.summary.landFreed.pasture;
    expect(total(run({ shift: 0.8 }))).toBeGreaterThan(total(run({ shift: 0.2 })));
  });

  it('never takes pasture below zero', () => {
    const r = run(preset('noAnimalFarming'));
    r.countries.forEach((c) => {
      expect(c.land.pasture + c.landChange.pasture).toBeGreaterThanOrEqual(0);
      expect(c.land.cropland + c.landChange.cropland).toBeGreaterThanOrEqual(-1e-6);
    });
    expect(
      pastureChange(
        { ha: 100, shares: { ruminantMeat: 1 } },
        { ruminantMeat: 10 },
        {
          ruminantMeat: -50,
        },
      ),
    ).toBe(-100);
  });

  it('moves pasture with each ruminant group by its share', () => {
    const pasture = { ha: 100, shares: { ruminantMeat: 0.6, dairy: 0.4 } };
    expect(pastureChange(pasture, { ruminantMeat: 10, dairy: 20 }, { ruminantMeat: -5 })).toBe(-30);
    expect(pastureChange(pasture, { ruminantMeat: 10, dairy: 20 }, { dairy: 10 })).toBe(20);
    expect(pastureChange(pasture, { dairy: 20 }, { ruminantMeat: -5 })).toBe(0);
    expect(pastureChange(undefined, {}, { dairy: -1 })).toBe(0);
  });

  it('with natural regrowth avoids more warming, through CO₂ only', () => {
    const none = run({ shift: 0.5 }, { regrowth: 'none' });
    const natural = run({ shift: 0.5 }, { regrowth: 'natural' });
    expect(natural.summary.avoidedWarming2050.median).toBeGreaterThan(
      none.summary.avoidedWarming2050.median,
    );
    expect(natural.summary.avoidedWarming2100.median).toBeGreaterThan(
      none.summary.avoidedWarming2100.median,
    );
    expect(natural.summary.avoided.ch4).toBe(none.summary.avoided.ch4);
    expect(natural.summary.avoided.n2o).toBe(none.summary.avoided.n2o);
    expect(natural.summary.avoided.co2 - none.summary.avoided.co2).toBeCloseTo(
      natural.summary.regrowthCo2.median,
      0,
    );
    natural.scenarioEmissions.forEach((e, i) => {
      expect(e.ch4).toBe(none.scenarioEmissions[i]?.ch4);
      expect(e.co2).toBeLessThanOrEqual(none.scenarioEmissions[i]?.co2 ?? 0);
    });
    expect(natural.baselineEmissions).toEqual(none.baselineEmissions);
    expect(none.summary.regrowthCo2).toEqual({ median: 0, p05: 0, p95: 0 });
    const { p05, median, p95 } = natural.summary.regrowthCo2;
    expect(p05).toBeLessThan(median);
    expect(median).toBeLessThan(p95);
  });

  it('stops the uptake regrowthYears after the land is freed', () => {
    const at = (r: ReturnType<typeof run>, year: number) =>
      co2Difference(run({ shift: 0.5, rampEnd: CURRENT_YEAR }), r)[year - CURRENT_YEAR] ?? 0;
    const natural = run({ shift: 0.5, rampEnd: CURRENT_YEAR }, { regrowth: 'natural' });
    const last = CURRENT_YEAR + data.land.regrowthYears - 1;
    expect(at(natural, CURRENT_YEAR)).toBeLessThan(0);
    expect(at(natural, last)).toBeLessThan(0);
    expect(at(natural, last + 1)).toBeCloseTo(0, 6);
    expect(at(natural, 2100)).toBeCloseTo(0, 6);
  });
});

describe('regrowth uptake', () => {
  const years = range(2026, 2100);
  it('starts in the year the land is freed and lasts its years', () => {
    const step = (y: number) => (y >= 2030 ? 1 : 0);
    const path = uptakePath(10, years, step, 30);
    expect(path[years.indexOf(2029)]).toBe(0);
    expect(path[years.indexOf(2030)]).toBe(10);
    expect(path[years.indexOf(2059)]).toBe(10);
    expect(path[years.indexOf(2060)]).toBe(0);
  });
  it('follows a ramp: each year’s freed land counts from that year', () => {
    const ramp = (y: number) => Math.min(1, Math.max(0, (y - 2026) / 10));
    const path = uptakePath(10, years, ramp, 30);
    expect(path[0]).toBe(0);
    expect(path[1]).toBeCloseTo(1);
    expect(path[years.indexOf(2036)]).toBeCloseTo(10);
    expect(path[years.indexOf(2057)]).toBeCloseTo(9);
    expect(path[years.indexOf(2066)]).toBeCloseTo(0);
  });

  it('frees the cake land of oilseeds with the animals that eat the cake', () => {
    const shares = () => ({ pigMeat: 0.5, poultryMeat: 0.5 });
    expect(oilcakeChange({ '2555': 100 }, shares, { pigMeat: -1, poultryMeat: -0.5 })).toBe(-75);
    expect(oilcakeChange({ '2555': 100 }, shares, { pigMeat: -2 })).toBe(-100);
    expect(oilcakeChange({ '2555': 100 }, () => undefined, { pigMeat: -1 })).toBe(0);
    expect(oilcakeChange(undefined, shares, { pigMeat: -1 })).toBe(0);
  });

  const real = loadRealData();
  it.skipIf(real === null)(
    'cuts cropland under a full plant-based shift, as Poore and Nemecek find',
    () => {
      const r = runScenario(
        real!,
        { ...BASE_SCENARIO, ...preset('noAnimalFarming') },
        DEFAULT_OPTIONS,
        CURRENT_YEAR,
      );
      const { landBefore, landFreed } = r.summary;
      const share = landFreed.cropland / landBefore.cropland;
      expect(share).toBeGreaterThan(0.02);
      expect(share).toBeLessThan(0.3);
      expect(landFreed.pasture / landBefore.pasture).toBeGreaterThan(0.95);
    },
  );
});
