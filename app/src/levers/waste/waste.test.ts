import { describe, expect, it } from 'vitest';
import { expectOwnGases, lever, production, run } from '../../../test/levers';
import { multiplierWith } from '../../model/supplyChain';
import { avoidedSupply, foodWithLessWaste, wasteShare } from './model';

describe('food waste and losses', () => {
  it.each(['foodWaste', 'supplyLosses'])('%s alone cuts every gas', (id) =>
    expectOwnGases(id, ['co2', 'ch4', 'n2o']),
  );
  it('follow waste.md’s example', () => {
    const food = Float64Array.from([800]);
    expect(foodWithLessWaste(food, Float64Array.from([0]), 0.125, 0.5)[0]).toBeCloseTo(-50);
    expect(multiplierWith(0.05, 0.03, 0)).toBeCloseTo(1 / 0.92);
    expect(multiplierWith(0.05, 0.03, 0.5)).toBeCloseTo(1 / 0.945);
    expect(wasteShare({ retail: 10, foodService: 40, household: 50 }, food, 1000)).toBe(0.125);
    expect(wasteShare({ retail: 900, foodService: 0, household: 0 }, food, 1000)).toBe(0.4);
    expect(wasteShare(undefined, food, 1000)).toBe(0);
    const [losses, lossShares, seedShares] = [[5], [0.05], [0.03]].map((v) => Float64Array.from(v));
    expect(avoidedSupply(losses!, lossShares!, seedShares!, 0.5)[0]).toBeCloseTo(2.5 / 0.945);
  });
  it('save the supply that would carry the losses and seed, not only the losses', () => {
    const supply = 100;
    const [loss, seed, cut] = [0.25, 0.05, 0.5];
    const use = supply * (1 - loss - seed);
    const after = use / (1 - (1 - cut) * loss - seed);
    const saved = avoidedSupply(
      Float64Array.from([loss * supply]),
      Float64Array.from([loss]),
      Float64Array.from([seed]),
      cut,
    );
    expect(saved[0]).toBeCloseTo(supply - after, 9);
  });
  it.each(['foodWaste', 'supplyLosses'])('%s lowers production and land', (id) => {
    const r = lever(id, 0.5);
    expect(production(r)).toBeLessThan(0);
    expect(r.summary.landFreed.cropland + r.summary.landFreed.pasture).toBeGreaterThan(0);
  });
  it('leaves what people eat unchanged', () => {
    const r = run({ levers: { foodWaste: 1, supplyLosses: 1 } });
    r.countries.forEach((c) => expect(c.proteinAfter).toBe(c.proteinBefore));
  });
  it('lowers the production a shift needs', () =>
    expect(production(lever('foodWaste', 0.5, { shift: 0.5 }))).toBeLessThan(
      production(run({ shift: 0.5 })),
    ));
});
