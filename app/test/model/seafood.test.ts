import { describe, expect, it } from 'vitest';
import { ANIMAL_GROUPS } from '../../src/data/types';
import { DEFAULT_OPTIONS, type Options, type Scenario } from '../../src/model/api';
import { removalShares } from '../../src/model/diet';
import { prepare, valueOf } from '../../src/model/prepare';
import { productionChanges, runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { CURRENT_YEAR, loadFixtures } from './fixtures';

const data = loadFixtures();
const prepared = prepare(data);
const run = (scenario: Partial<Scenario> = {}, options: Partial<Options> = {}) =>
  runScenario(
    data,
    { ...BASE_SCENARIO, ...scenario },
    { ...DEFAULT_OPTIONS, ...options },
    CURRENT_YEAR,
  );
const seafoodChange = (r: ReturnType<typeof run>) =>
  r.countries.reduce((a, c) => a + c.productionChange.seafood, 0);
const PELAGIC = '2763';
const fra = prepared.countries.find((c) => c.country.iso3 === 'FRA')!;

describe('seafood', () => {
  it('is an animal group with a key in every group record', () => {
    expect(ANIMAL_GROUPS).toContain('seafood');
    const r = run({ shift: 0.2 });
    r.countries.forEach((c) => {
      expect(c.production.seafood).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(c.productionChange.seafood)).toBe(true);
    });
  });
  it('shifts with the main slider and with its own', () => {
    expect(removalShares({ ...BASE_SCENARIO, shift: 0.3 }, fra).seafood).toBe(0.3);
    expect(
      removalShares({ ...BASE_SCENARIO, shift: 0.3, groupShifts: { seafood: 0.9 } }, fra).seafood,
    ).toBe(0.9);
    expect(seafoodChange(run({ groupShifts: { seafood: 0.5 } }))).toBeLessThan(0);
    const fishOnly = run({ groupShifts: { seafood: 1 } }, { scope: 'cradleToFarmGate' });
    expect(fishOnly.summary.avoidedWarming2050.median).not.toBe(0);
  });
  it('wild fish have no farm-gate emissions, only with inputs', () => {
    const intensity = data.intensities.byCountry['FRA']![PELAGIC]!;
    expect(intensity.farmGate!.kgPerTonne).toEqual({ co2: 0, ch4: 0, n2o: 0 });
    expect(intensity.cradleToFarmGate!.kgPerTonne.co2).toBeGreaterThan(0);
  });
  it('fish fed to animals fall with the animals they feed, once', () => {
    const { change } = productionChanges(
      prepared,
      { ...BASE_SCENARIO, groupShifts: { pigMeat: 1, poultryMeat: 1 } },
      DEFAULT_OPTIONS,
    );
    const world = prepared.countries.reduce(
      (a, pc) => a + valueOf(prepared, change[pc.country.iso3]!, PELAGIC),
      0,
    );
    expect(world).toBeLessThan(0);
    const fed = prepared.countries.reduce((a, pc) => a + (pc.rows.get(PELAGIC)?.feed ?? 0), 0);
    expect(-world).toBeLessThan(fed);
  });
  it('a full shift away from fish takes its fishmeal with it, never below zero', () => {
    const r = run({ shift: 1, groupShifts: Object.fromEntries(ANIMAL_GROUPS.map((g) => [g, 1])) });
    r.countries.forEach((c) =>
      expect(c.production.seafood + c.productionChange.seafood).toBeGreaterThanOrEqual(-1e-6),
    );
  });
});
