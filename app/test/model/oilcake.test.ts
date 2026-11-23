import { describe, expect, it } from 'vitest';
import { decodeIntensities } from '../../src/data/load';
import type { GasVector, ModelData } from '../../src/data/types';
import { DEFAULT_OPTIONS, type Options, type Scenario } from '../../src/model/api';
import { runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { CURRENT_YEAR, loadFixtures } from './fixtures';

const CAKE: GasVector = { co2: 2e8, ch4: 3e6, n2o: 4e5 };
const CAKE_HA = 1e5;

const withCake = (cake: Partial<Record<'farmGate' | 'cradleToFarmGate', GasVector>>): ModelData => {
  const data = loadFixtures();
  return {
    ...data,
    intensities: { ...data.intensities, oilcake: { FRA: { '2555': cake } } },
    land: { ...data.land, oilcakeHa: { FRA: { '2555': CAKE_HA } } },
  };
};

const run = (data: ModelData, scenario: Partial<Scenario>, options: Partial<Options> = {}) =>
  runScenario(
    data,
    { ...BASE_SCENARIO, ...scenario },
    { ...DEFAULT_OPTIONS, ...options },
    CURRENT_YEAR,
  );

const fra = (r: ReturnType<typeof run>) => r.countries.find((c) => c.iso3 === 'FRA');

describe('oilcake emissions', () => {
  it('are kept by the loader', () => {
    const oilcake = { FRA: { '2555': { farmGate: CAKE } } };
    expect(decodeIntensities({ sources: [], byCountry: {}, oilcake }).oilcake).toEqual(oilcake);
    expect(decodeIntensities({ sources: [], byCountry: {} })).not.toHaveProperty('oilcake');
  });

  it('add to the country’s base emissions, in the chosen scope or else the other', () => {
    const plain = fra(run(loadFixtures(), {}));
    const cake = fra(run(withCake({ cradleToFarmGate: CAKE }), {}));
    (['co2', 'ch4', 'n2o'] as const).forEach((g) =>
      expect((cake?.emissions[g] ?? 0) - (plain?.emissions[g] ?? 0)).toBeCloseTo(CAKE[g], 0),
    );
  });

  it('follow the demand for the cake, as its land does', () => {
    const shift = { shift: 1 };
    const plain = fra(run(loadFixtures(), shift));
    const cake = fra(run(withCake({ farmGate: CAKE }), shift));
    const landShare =
      ((cake?.landChange.cropland ?? 0) - (plain?.landChange.cropland ?? 0)) / CAKE_HA;
    expect(landShare).toBeLessThan(0);
    (['co2', 'ch4', 'n2o'] as const).forEach((g) =>
      expect(
        ((cake?.emissionsChange[g] ?? 0) - (plain?.emissionsChange[g] ?? 0)) / CAKE[g],
      ).toBeCloseTo(landShare, 9),
    );
  });

  it('count in the diet’s avoided emissions and are cut by the oilseed’s practices', () => {
    const avoided = (data: ModelData, scenario: Partial<Scenario>) =>
      run(data, scenario).summary.byFamily.avoidedCo2e;
    const cake = withCake({ farmGate: CAKE });
    expect(avoided(cake, { shift: 1 }).diet).toBeGreaterThan(
      avoided(loadFixtures(), { shift: 1 }).diet as number,
    );
    const nitrogen = { levers: { nitrogenEfficiency: 1 } };
    expect(avoided(cake, nitrogen).practices).toBeGreaterThan(
      avoided(loadFixtures(), nitrogen).practices as number,
    );
  });

  it('change nothing where the build has none', () => {
    const data = loadFixtures();
    const empty = { ...data, intensities: { ...data.intensities, oilcake: {} } };
    expect(run(empty, { shift: 0.5 })).toEqual(run(data, { shift: 0.5 }));
  });
});
