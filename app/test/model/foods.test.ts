import { describe, expect, it } from 'vitest';
import { ANIMAL_GROUPS } from '../../src/data/types';
import { COUNTED_CAUSES } from '../../src/levers/registry';
import { PRACTICES } from '../../src/levers/practices/data';
import { foodParts } from '../../src/model/attribution';
import { sum } from '../../src/model/util';
import { run } from '../levers';

const LEVERS = {
  ...Object.fromEntries(PRACTICES.map((p) => [p, 1])),
  rice: 0.5,
  palmOil: 1,
  foodWaste: 0.5,
  supplyLosses: 0.5,
  deforestation: 1,
  electricCars: 1,
};

const total = (r: Record<string, number>) => sum(Object.values(r));
const relative = (a: number, b: number) => Math.abs(a - b) / Math.max(1, Math.abs(b));

describe('foodParts', () => {
  it("gives each food its own effect and shares the rest of the family's out by their sizes", () => {
    const parts = foodParts(1, [0.6, -0.2], [0, 0]);
    expect(sum(parts)).toBeCloseTo(1, 12);
    expect(parts[0]).toBeCloseTo(0.6 + 0.6 * 0.75, 12);
    expect(parts[1]).toBeCloseTo(-0.2 + 0.6 * 0.25, 12);
  });
  it('splits by the sizes in farming where no food has an effect of its own, else equally', () => {
    expect(foodParts(0.3, [0, 0], [0.2, -0.1])).toEqual(
      [0.2, 0.1].map((v) => expect.closeTo(v, 12)),
    );
    expect(foodParts(0.3, [0, 0], [0, 0])).toEqual([0.15, 0.15]);
    expect(foodParts(0, [0.5, 0.5], [1, 1])).toEqual([0, 0]);
  });
});

describe('the breakdown by food', () => {
  const r = run({ shift: 0.5, groupShifts: { dairy: 1 }, levers: LEVERS }, { regrowth: 'natural' });
  const s = r.summary;

  it('splits the diet by each animal food it shifts, the plant food swaps by each, and less waste and practices by food group', () => {
    expect(Object.keys(s.byFood.avoidedWarming2100).sort()).toEqual([
      'diet',
      'plantFoods',
      'practices',
      'waste',
    ]);
    expect(Object.keys(s.byFood.avoidedWarming2100.diet ?? {})).toEqual([...ANIMAL_GROUPS]);
    expect(Object.keys(s.byFood.avoidedWarming2100.plantFoods ?? {})).toEqual(['rice', 'palmOil']);
    expect(s.byFood.avoidedWarming2100.diet?.ruminantMeat?.agriculture).toBeGreaterThan(0);
  });

  it("adds each family's foods up to its share, cause by cause", () => {
    (['avoidedWarming2050', 'avoidedWarming2100', 'avoidedCo2e'] as const).forEach((m) =>
      Object.entries(s.byFood[m]).forEach(([family, foods]) =>
        COUNTED_CAUSES.forEach((c) =>
          expect(
            relative(
              sum(Object.values(foods).map((byCause) => byCause[c])),
              s.byFamilyCause[m][family]?.[c] ?? 0,
            ),
            `${m} ${family} ${c}`,
          ).toBeLessThan(1e-9),
        ),
      ),
    );
  });

  it('gives the same split each year, adding up to the family and matching the summary at the horizons', () => {
    const { years, avoidedByFood } = r.temperature;
    const at = (y: number) => years.indexOf(y);
    Object.entries(avoidedByFood).forEach(([family, foods]) => {
      Object.entries(foods).forEach(([food, series]) => {
        const byCause = s.byFood.avoidedWarming2100[family]?.[food] ?? {};
        expect(series[at(2100)], `${family} ${food}`).toBeCloseTo(total(byCause), 9);
        const in2050 = s.byFood.avoidedWarming2050[family]?.[food] ?? {};
        expect(series[at(2050)], `${family} ${food}`).toBeCloseTo(total(in2050), 9);
        expect(series[at(2000)]).toBe(0);
      });
    });
  });

  it('leaves the summary of a family with a single food all to that food', () => {
    const one = run({ groupShifts: { ruminantMeat: 0.5 } }).summary;
    expect(total(one.byFood.avoidedWarming2100.diet?.ruminantMeat ?? {})).toBeCloseTo(
      one.byFamily.avoidedWarming2100.diet ?? 0,
      12,
    );
    expect(Object.keys(one.byFood.avoidedWarming2100.diet ?? {})).toEqual(['ruminantMeat']);
  });

  it('splits no family with nothing acting', () => {
    expect(run().summary.byFood.avoidedWarming2100).toEqual({});
  });
});
