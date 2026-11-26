import { describe, expect, it } from 'vitest';
import { expectOwnGases, jointShare, lever, rampShare, run, w2100 } from '../../../test/levers';
import { clearingParts, MAX_RISE, rewettedParts } from './model';

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
    expect(parts.lever).toBeCloseTo(-0.5 * 150);
    expect(parts.leverJoint).toBeCloseTo(-0.5 * -60);
    const capped = clearingParts(
      clearing,
      [Float64Array.from([50, 1])],
      Float64Array.from([10, 0]),
      0,
    );
    expect(capped.steps[0]).toBe(100 * MAX_RISE);
  });
  it('the lever at full adoption stops all of it', () => {
    const r = lever('deforestation');
    expect(r.summary.deforestationCo2.avoided).toBeCloseTo(r.summary.deforestationCo2.before, 0);
    r.countries.forEach((c) => expect(c.deforestationChange).toBeCloseTo(-c.deforestationCo2, 0));
  });
  it('stops the clearing the shift changed as both ramp in', () => {
    const joint = jointShare('deforestation', 'co2', false);
    const r = rampShare(2030);
    expect(joint(2035)).not.toBe(0);
    expect(joint(2030) / joint(2035)).toBeCloseTo(r * r, 9);
  });
  it('a shift away from beef lowers it', () => {
    const r = run({ groupShifts: { ruminantMeat: 1 } });
    expect(r.summary.deforestationCo2.avoided).toBeGreaterThan(0);
    expect(r.summary.byFamily.avoidedWarming2050.deforestation).toBe(0);
  });
  it('carries the CO₂ of drained soils with production, which the lever does not stop', () => {
    const france = (r: ReturnType<typeof run>) =>
      r.countries.find((c) => c.iso3 === 'FRA') ?? expect.fail('no France');
    const stopped = france(lever('deforestation'));
    expect(stopped.drainedCo2).toBe(3.0e9);
    expect(stopped.drainedChange).toBe(0);
    const beef = france(run({ groupShifts: { ruminantMeat: 1 } }));
    expect(beef.drainedChange).toBeLessThan(0);
    expect(beef.drainedChange).toBeGreaterThanOrEqual(-2.0e9);
  });
  it('rewets the drained land production frees, and the lever a share of what is left', () => {
    const ch4 = Float64Array.from([10, 20]);
    const emitting = Float64Array.from([10, 10]);
    const diet = Float64Array.from([-5, 5]);
    const all = Float64Array.from([-6, 5]);
    const parts = rewettedParts(ch4, [diet, all], emitting, 0.5);
    expect(parts.before).toBe(0);
    expect(parts.steps[0]).toBeCloseTo(5);
    expect(parts.steps[1]).toBeCloseTo(1);
    expect(parts.lever).toBeCloseTo(15);
    expect(parts.leverJoint).toBeCloseTo(2);
    expect(rewettedParts(ch4, [all], emitting, 0).lever).toBe(0);
  });
  it('rewetting the peat stops its CO₂ and adds the methane rewetted peat emits', () => {
    const r = lever('peatRewetting');
    const france = r.countries.find((c) => c.iso3 === 'FRA') ?? expect.fail('no France');
    expect(france.drainedChange).toBeCloseTo(-3.0e9, -3);
    expect(france.rewettedCh4).toBeCloseTo(3.0e7, -1);
    expect(france.deforestationChange).toBe(0);
    expect(r.summary.avoided.co2).toBeGreaterThan(0);
    expect(r.summary.avoided.ch4).toBeLessThan(0);
    expect(w2100(r)).toBeGreaterThan(0);
    expect(run().countries.find((c) => c.iso3 === 'FRA')?.rewettedCh4).toBe(0);
  });
  it('counts the methane of the drained land a shift away from beef frees', () => {
    const beef = run({ groupShifts: { ruminantMeat: 1 } });
    const france = beef.countries.find((c) => c.iso3 === 'FRA') ?? expect.fail('no France');
    expect(france.rewettedCh4).toBeGreaterThan(0);
    expect(france.rewettedCh4).toBeLessThanOrEqual(2.0e7);
  });
  it('moves the forest area cleared as it moves the CO₂', () => {
    const brazil = (s: Parameters<typeof run>[0]) =>
      run(s).countries.find((c) => c.iso3 === 'BRA') ?? expect.fail('no Brazil');
    const today = brazil({});
    expect(today.deforestationHa).toBe(8.9e5);
    expect(today.deforestationHaChange).toBe(0);
    const beef = brazil({ groupShifts: { ruminantMeat: 1 } });
    expect(beef.deforestationHaChange).toBeLessThan(0);
    expect(beef.deforestationHaChange / beef.deforestationHa).toBeCloseTo(
      beef.deforestationChange / beef.deforestationCo2,
      1,
    );
    const stopped = lever('deforestation').countries.find((c) => c.iso3 === 'BRA');
    expect(stopped?.deforestationHaChange).toBeCloseTo(-8.9e5, 0);
  });
});
