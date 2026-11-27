import { describe, expect, it } from 'vitest';
import { data, lever, run, w2050 } from '../../../test/levers';
import { CURRENT_YEAR } from '../../../test/model/fixtures';
import { loadRealData } from '../../../test/model/realData';
import type { ModelData } from '../../data/types';
import { DEFAULT_OPTIONS } from '../../model/api';
import { foodChange } from '../../model/diet';
import { prepare, valueOf } from '../../model/prepare';
import { runScenario } from '../../model/run';
import { BASE_SCENARIO } from '../../model/scenarios';
import { sum } from '../../model/util';
import { PLANT_SWAPS } from './data';
import { plantSwapChange, substitutesOf, swappedUse } from './model';

const prepared = prepare(data);
const country = (iso3: string, p = prepared) =>
  p.countries.find((pc) => pc.country.iso3 === iso3) as (typeof p.countries)[number];
const RICE = '2807';
const kcalOf = (v: Float64Array) =>
  sum(prepared.items.map((item, i) => item.kcalPerTonne * (v[i] as number)));
const ind = country('IND');

describe('replacing a plant food', () => {
  it('takes its share of the food and gives the same calories to the substitutes', () => {
    const change = plantSwapChange(ind.food, [0.5, 0], ind, prepared);
    expect(valueOf(prepared, change, RICE)).toBeCloseTo(-0.5 * valueOf(prepared, ind.food, RICE));
    expect(Math.abs(kcalOf(change))).toBeLessThan(1e-6 * kcalOf(ind.food));
    prepared.items.forEach((item, i) =>
      expect((change[i] as number) > 0 ? PLANT_SWAPS.rice.substitute(item) : true).toBe(true),
    );
  });

  it('shares the calories by the country’s own mix of the substitutes', () => {
    const mix = substitutesOf('rice', ind, prepared);
    const [wheat, maize] = ['2511', '2514'].map((c) => prepared.indexOf.get(c) as number);
    const kcal = (i: number) => (ind.food[i] as number) * (prepared.items[i]?.kcalPerTonne ?? 0);
    expect((mix[wheat as number] as number) / (mix[maize as number] as number)).toBeCloseTo(
      kcal(wheat as number) / kcal(maize as number),
    );
    expect(valueOf(prepared, mix, RICE)).toBe(0);
  });

  it('replaces what the animal shift adds too, so 100% leaves none eaten', () => {
    const diet = foodChange({ ...BASE_SCENARIO, shift: 1 }, ind, prepared);
    const use = swappedUse(ind, diet, [1, 0], prepared);
    expect(valueOf(prepared, ind.food, RICE) + valueOf(prepared, use, RICE)).toBeCloseTo(0);
  });

  it('cuts rice production and its methane, counted to its own family', () => {
    const r = lever('rice');
    expect(sum(r.countries.map((c) => c.productionChange.rice))).toBeLessThan(0);
    expect(sum(r.countries.map((c) => c.emissionsChange.ch4))).toBeLessThan(0);
    expect(w2050(r)).toBeGreaterThan(0);
    expect(r.summary.byFamily.avoidedWarming2050.plantFoods).toBeCloseTo(w2050(r), 9);
  });

  it('adds to what the diet shift avoids', () => {
    const both = run({ shift: 0.5, levers: { rice: 1 } });
    expect(w2050(both)).toBeGreaterThan(w2050(run({ shift: 0.5 })));
  });
});

const real = loadRealData();

describe.skipIf(real === null)('replacing palm oil on the real data', () => {
  const r = runScenario(
    real as ModelData,
    { ...BASE_SCENARIO, levers: { palmOil: 1 } },
    DEFAULT_OPTIONS,
    CURRENT_YEAR,
  );
  const of = (iso3: string) => r.countries.find((c) => c.iso3 === iso3);

  it('cuts clearing and drained peat where oil palm is grown', () =>
    ['IDN', 'MYS'].forEach((iso3) => {
      expect(of(iso3)?.deforestationChange, iso3).toBeLessThan(0);
      expect(of(iso3)?.drainedChange, iso3).toBeLessThan(0);
    }));

  it('grows the other vegetable oils instead', () => {
    const p = prepare(real as ModelData);
    const pc = country('IND', p);
    const change = plantSwapChange(pc.food, [0, 1], pc, p);
    expect(valueOf(p, change, '2577')).toBeLessThan(0);
    expect(valueOf(p, change, '2571')).toBeGreaterThan(0);
  });
});
