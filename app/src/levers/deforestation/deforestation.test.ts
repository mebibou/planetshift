import { describe, expect, it } from 'vitest';
import { expectOwnGases, lever, run } from '../../../test/levers';
import { clearingParts, relativeChange } from './model';

describe('deforestation', () => {
  it('alone cuts CO₂ only', () => expectOwnGases('deforestation', ['co2']));
  it('moves with the production of the item it serves, and stops with the lever', () => {
    const clearing = Float64Array.from([100, 50]);
    const emitting = Float64Array.from([10, 10]);
    const diet = Float64Array.from([-5, 0]);
    const all = Float64Array.from([-6, 0]);
    const parts = clearingParts(clearing, [diet, all], emitting, 0.5);
    expect(parts.before).toBe(150);
    expect(parts.steps[0]).toBeCloseTo(-50);
    expect(parts.steps[1]).toBeCloseTo(-10);
    expect(parts.lever).toBeCloseTo(-0.5 * (40 + 50));
    expect(relativeChange(Float64Array.from([50, 1]), Float64Array.from([10, 0]))).toEqual(
      Float64Array.from([1, 0]),
    );
  });
  it('the lever at full adoption stops all of it', () => {
    const r = lever('deforestation');
    expect(r.summary.deforestationCo2.avoided).toBeCloseTo(r.summary.deforestationCo2.before, 0);
    r.countries.forEach((c) => expect(c.deforestationChange).toBeCloseTo(-c.deforestationCo2, 0));
  });
  it('a shift away from beef lowers it', () => {
    const r = run({ groupShifts: { ruminantMeat: 1 } });
    expect(r.summary.deforestationCo2.avoided).toBeGreaterThan(0);
    expect(r.summary.byFamily.avoidedWarming2050.deforestation).toBe(0);
  });
});
