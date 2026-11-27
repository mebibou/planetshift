import { describe, expect, it } from 'vitest';
import { pollinationShares, pollinationTotals, sharesOf } from '../../src/app/pollination';
import type { Item } from '../../src/data/types';
import { DEFAULT_OPTIONS, type Scenario } from '../../src/model/api';
import { perTonne, pollinationOf } from '../../src/model/pollination';
import { runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { CURRENT_YEAR, loadFixtures } from './fixtures';
import { loadRealData } from './realData';

const data = loadFixtures();
const run = (scenario: Partial<Scenario>, d = data) =>
  runScenario(d, { ...BASE_SCENARIO, ...scenario }, DEFAULT_OPTIONS, CURRENT_YEAR);

const apple = { code: 2617, animal: false, kcalPerTonne: 500_000 } as Item;

describe('pollinator dependence', () => {
  it('counts a tonne of a rated item in full, its dependent part and its ratio', () => {
    expect(perTonne(apple, [0.65, 1])).toEqual({
      tonnes: 1,
      dependentTonnes: 1,
      attributableTonnes: 0.65,
      kcal: 500_000,
      dependentKcal: 500_000,
      attributableKcal: 325_000,
    });
  });

  it('leaves out an item without a ratio', () => {
    expect(perTonne(apple, undefined).tonnes).toBe(0);
    expect(perTonne(apple, undefined).kcal).toBe(0);
  });

  it('sums each item’s production and change by its values per tonne', () => {
    const one = Float64Array.from([1, 0]);
    const v = {
      perTonne: {
        tonnes: Float64Array.from([1, 1]),
        dependentTonnes: one,
        attributableTonnes: Float64Array.from([0.25, 0]),
        kcal: Float64Array.from([10, 20]),
        dependentKcal: Float64Array.from([10, 0]),
        attributableKcal: Float64Array.from([2.5, 0]),
      },
      before: perTonne(apple, undefined),
    };
    const out = pollinationOf(v, Float64Array.from([4, -2]));
    expect(out.pollinationChange).toEqual({
      tonnes: 2,
      dependentTonnes: 4,
      attributableTonnes: 1,
      kcal: 0,
      dependentKcal: 40,
      attributableKcal: 10,
    });
  });

  it('gives the shares of crop production, by tonnes and by kcal', () => {
    expect(
      sharesOf({
        tonnes: 100,
        dependentTonnes: 30,
        attributableTonnes: 6,
        kcal: 1000,
        dependentKcal: 100,
        attributableKcal: 10,
      }),
    ).toEqual({
      dependentTonnes: 0.3,
      attributableTonnes: 0.06,
      dependentKcal: 0.1,
      attributableKcal: 0.01,
    });
  });

  it('takes a country’s own ratio before the world’s', () => {
    const countries = run({ shift: 0 }).countries;
    const share = (iso3: string) =>
      pollinationShares(countries.filter((c) => c.iso3 === iso3))?.before.attributableTonnes ?? 0;
    expect(share('FRA')).toBeGreaterThan(0);
    const fra = countries.find((c) => c.iso3 === 'FRA');
    const without = run(
      { shift: 0 },
      { ...data, pollination: { ...data.pollination!, byCountry: {} } },
    );
    const plain = without.countries.find((c) => c.iso3 === 'FRA');
    expect(fra?.pollination?.attributableTonnes).toBeGreaterThan(
      plain?.pollination?.attributableTonnes ?? Infinity,
    );
  });

  it('is none for every country without the file', () => {
    const without = run({ shift: 1 }, { ...data, pollination: undefined });
    expect(pollinationShares(without.countries)).toBeNull();
    expect(without.countries[0]?.pollination).toBeUndefined();
  });

  it('changes with a full diet shift, and stays as it is without one', () => {
    const still = pollinationShares(run({ shift: 0 }).countries);
    expect(still?.after.dependentTonnes).toBeCloseTo(still?.before.dependentTonnes ?? -1, 12);
    const shifted = run({ shift: 1 }).countries;
    const totals = shifted.map(pollinationTotals);
    const before = totals.reduce((a, t) => a + t.before.tonnes, 0);
    const after = totals.reduce((a, t) => a + t.after.tonnes, 0);
    expect(Math.abs(after / before - 1)).toBeGreaterThan(0.01);
  });

  it('lies within IPBES’s 5–8% of production on the real data', () => {
    const real = loadRealData();
    if (real?.pollination) {
      const today = pollinationShares(run({ shift: 0 }, real).countries);
      const full = pollinationShares(run({ shift: 1 }, real).countries);
      expect(today?.before.attributableTonnes).toBeGreaterThan(0.05);
      expect(today?.before.attributableTonnes).toBeLessThan(0.08);
      expect(full?.after.dependentTonnes).toBeGreaterThan(0.2);
    }
  });
});
