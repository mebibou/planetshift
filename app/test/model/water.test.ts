import { describe, expect, it } from 'vitest';
import { waterTotal, type WaterTotal } from '../../src/app/water';
import { DEFAULT_OPTIONS, type Scenario } from '../../src/model/api';
import { runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { waterOf } from '../../src/model/water';
import { CURRENT_YEAR, loadFixtures } from './fixtures';

const data = loadFixtures();
const run = (scenario: Partial<Scenario>, d = data) =>
  runScenario(d, { ...BASE_SCENARIO, ...scenario }, DEFAULT_OPTIONS, CURRENT_YEAR);

const own = {
  litres: Float64Array.from([1000, 50]),
  scarcity: Float64Array.from([4000, 0]),
  cake: { 2555: 600 },
};
const cake = { relative: { pigMeat: -0.5 }, sharesOf: () => ({ pigMeat: 1 }) };

describe('freshwater withdrawn', () => {
  it('is litres per tonne times production, with the cake following the animals it feeds', () => {
    const w = waterOf(own, Float64Array.from([3, 10]), Float64Array.from([-1, 2]), cake);
    expect(w.water).toBe(1000 * 3 + 50 * 10 + 600);
    expect(w.waterChange).toBe(-1000 + 100 - 300);
    expect(w.waterScarcity).toBe(12000);
    expect(w.waterScarcityChange).toBe(-4000);
  });

  it('sums each country’s items as the file gives them', () => {
    const fra = run({ shift: 0 }).countries.find((c) => c.iso3 === 'FRA');
    expect(fra?.water).toBeGreaterThan(0);
    expect(fra?.waterScarcity).toBeGreaterThan(0);
    expect(fra?.irrigatedHa).toBe(2.9e6);
  });

  it('is none for a country the file leaves out, and for every country without the file', () => {
    expect(run({ shift: 0 }).countries.find((c) => c.iso3 === 'NGA')?.water).toBe(0);
    const without = run({ shift: 1 }, { ...data, water: undefined });
    expect(waterTotal(without.countries)).toBeNull();
  });

  it('moves with a full diet shift, and stays as it is without one', () => {
    const shifted = waterTotal(run({ shift: 1 }).countries) as WaterTotal;
    expect(Math.abs(shifted.after / shifted.before - 1)).toBeGreaterThan(0.01);
    const still = waterTotal(run({ shift: 0 }).countries) as WaterTotal;
    expect(still.after).toBeCloseTo(still.before, 0);
    expect(still.before).toBe(shifted.before);
  });
});
