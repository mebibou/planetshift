import { describe, expect, it } from 'vitest';
import { GASES, type GasVector, type ModelData } from '../../src/data/types';
import { LEVER_IDS } from '../../src/levers/registry';
import { DEFAULT_OPTIONS, type CountryResult, type Options } from '../../src/model/api';
import type { FoodEmissions } from '../../src/model/foodEmissions';
import { runScenario } from '../../src/model/run';
import { nonFoodEmissions } from '../../src/model/emissions';
import { prepare } from '../../src/model/prepare';
import { CURRENT_YEAR, loadFixtures } from './fixtures';
import { loadRealData } from './realData';
import { SAMPLES } from './samples';

const ALL_LEVERS = Object.fromEntries(LEVER_IDS.map((id) => [id, 1]));

const foodsOf = (c: CountryResult): FoodEmissions[] => Object.values(c.foods ?? {});

const gasSum = (vs: readonly (GasVector | undefined)[]): GasVector =>
  Object.fromEntries(GASES.map((g) => [g, vs.reduce((a, v) => a + (v?.[g] ?? 0), 0)])) as GasVector;

const partSum = (c: CountryResult, key: string, k: 0 | 1): number =>
  foodsOf(c).reduce((a, f) => a + (f.parts[key]?.[k] ?? 0), 0);

/** Close in relative terms, for sums of kg that reach 1e12. */
const near = (actual: number, expected: number, label: string) =>
  expect(Math.abs(actual - expected), label).toBeLessThanOrEqual(
    1e-9 * Math.max(1, Math.abs(expected)),
  );

/** Each country's food groups add up to its figures on the map's layers for every food. */
const checkSums = (
  data: ModelData,
  scenario: (typeof SAMPLES)[number]['scenario'],
  options: Partial<Options> = {},
) => {
  const r = runScenario(data, scenario, { ...DEFAULT_OPTIONS, ...options }, CURRENT_YEAR);
  const prepared = prepare(data);
  r.countries.forEach((c) => {
    const foods = foodsOf(c);
    const nonFood = nonFoodEmissions(prepared, c.iso3);
    const farm = gasSum(foods.map((f) => f.farm));
    const farmChange = gasSum(foods.map((f) => f.farmChange));
    GASES.forEach((g) => {
      near(farm[g] + nonFood[g], c.emissions[g], `${c.iso3} farm ${g}`);
      near(farmChange[g], c.emissionsChange[g], `${c.iso3} farm change ${g}`);
      if (c.chain && c.chainChange) {
        near(gasSum(foods.map((f) => f.chain))[g], c.chain[g], `${c.iso3} chain ${g}`);
        near(
          gasSum(foods.map((f) => f.chainChange))[g],
          c.chainChange[g],
          `${c.iso3} chain change ${g}`,
        );
      }
    });
    near(partSum(c, 'deforestationCo2', 0), c.deforestationCo2 ?? 0, `${c.iso3} clearing`);
    near(
      partSum(c, 'deforestationCo2', 1),
      c.deforestationChange ?? 0,
      `${c.iso3} clearing change`,
    );
    near(partSum(c, 'drainedCo2', 0), c.drainedCo2 ?? 0, `${c.iso3} drained`);
    near(partSum(c, 'drainedCo2', 1), c.drainedChange ?? 0, `${c.iso3} drained change`);
  });
  return r;
};

describe('emissions by food group on the map', () => {
  SAMPLES.forEach((s) =>
    it(`add up to each country's emissions on the fixtures (${s.id})`, () => {
      checkSums(loadFixtures(), s.scenario, s.options);
    }),
  );

  it('add up with every lever and the other location and feed', () => {
    const scenario = { ...SAMPLES[0]!.scenario, shift: 0.6, levers: ALL_LEVERS };
    checkSums(loadFixtures(), scenario, { location: 'domestic', feed: 'gleam' });
    checkSums(loadFixtures(), scenario, { scope: 'farmGate' });
  });

  it('move with the shift: less ruminant meat cuts its emissions', () => {
    const r = checkSums(loadFixtures(), {
      ...SAMPLES[0]!.scenario,
      groupShifts: { ruminantMeat: 1 },
    });
    const beef = r.countries.flatMap((c) => (c.foods?.ruminantMeat ? [c.foods.ruminantMeat] : []));
    expect(beef.length).toBeGreaterThan(0);
    beef.forEach((f) => expect(f.farmChange.ch4).toBeLessThan(0));
  });

  const real = loadRealData();
  it.skipIf(real === null)('add up to each country’s emissions on the real data', () => {
    const data = real as ModelData;
    const r = checkSums(data, { ...SAMPLES[0]!.scenario, shift: 0.5, levers: ALL_LEVERS });
    expect(r.countries.some((c) => partSum(c, 'deforestationCo2', 1) < 0)).toBe(true);
    expect(r.countries.some((c) => (c.foods?.rice?.farmChange.ch4 ?? 0) < 0)).toBe(true);
  });
});
