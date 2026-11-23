import { describe, expect, it } from 'vitest';
import { decodeIntensities } from '../../src/data/load';
import { ANIMAL_GROUPS, GASES, type GasVector, type ModelData } from '../../src/data/types';
import { LEVER_IDS } from '../../src/levers/registry';
import { DEFAULT_OPTIONS, type Options, type Scenario } from '../../src/model/api';
import { runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { sum } from '../../src/model/util';
import { CURRENT_YEAR, loadFixtures } from './fixtures';
import { loadRealData } from './realData';

const NON_FOOD: GasVector = { co2: 0, ch4: 2e8, n2o: 3e6 };
const ALL_LEVERS = Object.fromEntries(LEVER_IDS.map((id) => [id, 1]));

const withNonFood = (): ModelData => {
  const data = loadFixtures();
  return { ...data, intensities: { ...data.intensities, nonFood: { FRA: NON_FOOD } } };
};

const run = (data: ModelData, scenario: Partial<Scenario>, options: Partial<Options> = {}) =>
  runScenario(
    data,
    { ...BASE_SCENARIO, ...scenario },
    { ...DEFAULT_OPTIONS, ...options },
    CURRENT_YEAR,
  );

const fra = (r: ReturnType<typeof run>) => r.countries.find((c) => c.iso3 === 'FRA');

describe('emissions of animals not raised for food', () => {
  it('are kept by the loader', () => {
    const nonFood = { FRA: NON_FOOD };
    expect(decodeIntensities({ sources: [], byCountry: {}, nonFood }).nonFood).toEqual(nonFood);
    expect(decodeIntensities({ sources: [], byCountry: {} })).not.toHaveProperty('nonFood');
  });

  it('add to the country’s base emissions and no shift or lever changes them', () => {
    const scenario = { shift: 1, levers: ALL_LEVERS };
    const plain = fra(run(loadFixtures(), scenario));
    const held = fra(run(withNonFood(), scenario));
    GASES.forEach((g) => {
      expect((held?.emissions[g] ?? 0) - (plain?.emissions[g] ?? 0)).toBeCloseTo(NON_FOOD[g], 0);
      expect(held?.emissionsChange[g]).toBe(plain?.emissionsChange[g]);
    });
  });

  it('change nothing where the build has none', () => {
    const data = loadFixtures();
    const empty = { ...data, intensities: { ...data.intensities, nonFood: {} } };
    expect(run(empty, { shift: 0.5 })).toEqual(run(data, { shift: 0.5 }));
  });
});

describe('a full shift on the real data', () => {
  const real = loadRealData();
  const variants: Partial<Options>[] = [{}, { location: 'domestic' }, { feed: 'gleam' }];
  variants.forEach((options) =>
    it.skipIf(real === null)(
      `leaves no food production in any animal group (${JSON.stringify(options)})`,
      () => {
        const r = run(real!, { shift: 1 }, options);
        ANIMAL_GROUPS.forEach((g) => {
          const before = sum(r.countries.map((c) => c.production[g]));
          const change = sum(r.countries.map((c) => c.productionChange[g]));
          expect(before).toBeGreaterThan(0);
          expect(change / before).toBeCloseTo(-1, 6);
        });
        expect(r.summary.clipped).toEqual([]);
      },
    ),
  );

  it.skipIf(real === null)('keeps the non-food baseline', () => {
    const nonFood = Object.entries(real!.intensities.nonFood ?? {});
    expect(nonFood.length).toBeGreaterThan(0);
    const r = run(real!, { shift: 1 });
    const ind = r.countries.find((c) => c.iso3 === 'IND');
    const held = real!.intensities.nonFood?.IND as GasVector;
    expect(held.ch4).toBeGreaterThan(1e9);
    expect((ind?.emissions.ch4 ?? 0) + (ind?.emissionsChange.ch4 ?? 0)).toBeGreaterThanOrEqual(
      held.ch4,
    );
  });
});
