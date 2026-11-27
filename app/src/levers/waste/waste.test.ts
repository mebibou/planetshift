import { describe, expect, it } from 'vitest';
import { expectOwnGases, lever, production, run } from '../../../test/levers';
import { cropsOf, ownProduction } from '../../model/crops';
import type { Prepared, PreparedCountry } from '../../model/prepare';
import { multiplierWith } from '../../model/supplyChain';
import { afterShops, foodWasteOf, lostTonnes, productionRatio } from './foodWaste';
import {
  avoidedSupply,
  foodWithLessWaste,
  lossGroupOf,
  lossSharesWith,
  multipliersWith,
  wasteShare,
} from './model';

describe('food waste and losses', () => {
  it.each(['foodWaste', 'supplyLosses'])('%s alone cuts every gas', (id) =>
    expectOwnGases(id, ['co2', 'ch4', 'n2o', 'hfc']),
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
    const m = multipliersWith(Float64Array.from([1 / 0.92]), lossShares!, seedShares!, 0.5);
    expect(avoidedSupply(losses!, m, 0.5)[0]).toBeCloseTo(2.5 / 0.945);
  });
  it('take FAO’s loss share for an item’s group where above the food balance’s', () => {
    const groups = (['cereals', 'fruit', 'oilCrops'] as const).map(lossGroupOf);
    expect(groups).toEqual(['cerealsPulses', 'fruitVegetables', 'all']);
    const fao = {
      cerealsPulses: 0.08,
      fruitVegetables: 0.25,
      rootsTubers: 0.12,
      animal: 0.14,
      all: 0.13,
    };
    const shares = lossSharesWith(Float64Array.from([0.1, 0.05, 0.02]), groups, fao);
    expect(Array.from(shares)).toEqual([0.1, 0.25, 0.13]);
    expect(lossSharesWith(Float64Array.from([0.1]), groups, undefined)[0]).toBe(0.1);
  });
  it('keep every multiplier with no cut, whatever the loss share', () => {
    const base = Float64Array.from([1.2]);
    expect(multipliersWith(base, Float64Array.from([0.25]), Float64Array.from([0.05]), 0)[0]).toBe(
      1.2,
    );
    expect(
      multipliersWith(base, Float64Array.from([0.25]), Float64Array.from([0.05]), 1)[0],
    ).toBeLessThan(1.2);
  });
  it('save the supply that would carry the losses and seed, not only the losses', () => {
    const supply = 100;
    const [loss, seed, cut] = [0.25, 0.05, 0.5];
    const use = supply * (1 - loss - seed);
    const after = use / (1 - (1 - cut) * loss - seed);
    const m = multipliersWith(
      Float64Array.from([1 / (1 - loss - seed)]),
      Float64Array.from([loss]),
      Float64Array.from([seed]),
      cut,
    );
    const saved = avoidedSupply(Float64Array.from([loss * supply]), m, cut);
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
  it('share the waste after shops by sector and scale losses with production', () => {
    expect(afterShops({ retail: 10, foodService: 30, household: 60 }, 50)).toEqual({
      retail: 5,
      foodService: 15,
      household: 30,
    });
    expect(afterShops(undefined, 50)).toEqual({ retail: 0, foodService: 0, household: 0 });
    expect(productionRatio(100, -25)).toBe(0.75);
    expect(productionRatio(0, 10)).toBe(1);
    const shares = Float64Array.from([0.1, 0.2]);
    const supply = Float64Array.from([100, 50]);
    expect(lostTonnes(shares, supply)).toBeCloseTo(20);
    const production = {
      crops: ownProduction(Float64Array.from([100, 0])),
      change: Float64Array.from([-50, 5]),
    };
    expect(lostTonnes(shares, supply, production)).toBeCloseTo(15);
  });
  it('move a crop’s losses with the demand for what is made from it', () => {
    const prepared = {
      indexOf: new Map([
        ['2562', 0],
        ['2577', 1],
      ]),
      data: { land: { extraction: { '2577': { '2562': 0.23 } } } },
    } as unknown as Prepared;
    const pc = {
      emitting: Float64Array.from([1, 23]),
      rows: new Map(),
    } as unknown as PreparedCountry;
    const lessOil = { crops: cropsOf(pc, prepared), change: Float64Array.from([0, -2.3]) };
    const shares = Float64Array.from([0.1, 0]);
    const supply = Float64Array.from([1000, 0]);
    expect(lostTonnes(shares, supply, lessOil)).toBeCloseTo((100 * 91) / 101);
  });
  it('count food lost and wasted today and less of it with the cuts', () => {
    const fw = foodWasteOf(
      {
        share: 0.1,
        food: Float64Array.from([800]),
        dietFood: Float64Array.from([-200]),
        lossShares: Float64Array.from([0.05]),
        supply: Float64Array.from([1000]),
        crops: ownProduction(Float64Array.from([1000])),
        change: Float64Array.from([-200]),
        wasteCut: 0.5,
        lossCut: 0.5,
      },
      { retail: 0, foodService: 0, household: 1 },
    );
    expect(fw.before).toEqual({ losses: 50, retail: 0, foodService: 0, household: 80 });
    expect(fw.change.household).toBeCloseTo(0.1 * 0.5 * 600 - 80);
    expect(fw.change.losses).toBeCloseTo(0.5 * 0.05 * 1000 * 0.8 - 50);
  });
  it.each([
    ['foodWaste', 'household'],
    ['supplyLosses', 'losses'],
  ] as const)('%s cuts the world’s food %s', (id, stage) => {
    const total = (r: ReturnType<typeof run>, after: boolean) =>
      r.countries.reduce(
        (a, c) => a + (c.foodWaste?.[stage] ?? 0) + (after ? (c.foodWasteChange?.[stage] ?? 0) : 0),
        0,
      );
    const r = lever(id, 0.5);
    expect(total(r, false)).toBeGreaterThan(0);
    expect(total(r, true)).toBeLessThan(total(r, false));
    expect(total(run(), true)).toBeCloseTo(total(run(), false));
  });
  it('lowers the production a shift needs', () =>
    expect(production(lever('foodWaste', 0.5, { shift: 0.5 }))).toBeLessThan(
      production(run({ shift: 0.5 })),
    ));
});
