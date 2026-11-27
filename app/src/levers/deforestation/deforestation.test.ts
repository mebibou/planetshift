import { describe, expect, it } from 'vitest';
import { expectOwnGases, jointShare, lever, rampShare, run, w2100 } from '../../../test/levers';
import type { Prepared, PreparedCountry } from '../../model/prepare';
import { cropsOf, primaryWeights } from '../../model/crops';
import { clearingParts, MAX_RISE, relativeChanges, rewettedParts } from './model';

/** A country with the `emitting` production of the items `codes`, and its extraction rates. */
const country = (
  codes: string[],
  emitting: number[],
  land: Partial<Prepared['data']['land']>,
  processing: Record<string, number> = {},
) => {
  const prepared = {
    indexOf: new Map(codes.map((c, i) => [c, i])),
    data: { land },
  } as unknown as Prepared;
  const pc = {
    emitting: Float64Array.from(emitting),
    rows: new Map(Object.entries(processing).map(([c, t]) => [c, { processing: t }])),
  } as unknown as PreparedCountry;
  return { pc, crops: cropsOf(pc, prepared) };
};

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
  it('follows the demand for the oil made from a crop, back through its extraction rate', () => {
    const { pc, crops } = country(['2562', '2577'], [1, 23], {
      extraction: { '2577': { '2562': 0.23 } },
    });
    expect(crops.base[0]).toBeCloseTo(101);
    const clearing = Float64Array.from([100, 0]);
    const lessOil = [Float64Array.from([0, -2.3])];
    const items = Uint32Array.from([0]);
    const rel = relativeChanges(lessOil, pc.emitting, items, crops);
    expect(clearingParts(clearing, lessOil, pc.emitting, 0, undefined, rel).steps[0]).toBeCloseTo(
      (-100 * 10) / 101,
    );
    expect(clearingParts(clearing, lessOil, pc.emitting, 0).steps[0]).toBe(0);
  });
  it('follows the demand for the cake of an oilseed by its share of the crush', () => {
    const { pc, crops } = country(['2555', '2571'], [0, 19], {
      extraction: { '2571': { '2555': 0.19 } },
      crush: { '2555': { oil: '2571', oilShare: 0.4 } },
    });
    const cake = { relative: { pigMeat: -0.5 }, sharesOf: () => ({ pigMeat: 1 }) };
    const none = [Float64Array.from([0, 0])];
    const rel = relativeChanges(none, pc.emitting, Uint32Array.from([0]), crops, [cake]);
    expect(rel[0]).toBeCloseTo(0.6 * -0.5);
  });
  it('shares an item made from two crops by what the country processes of each', () => {
    expect(primaryWeights([0.11, 0.16], [100, 0])).toEqual([1, 0]);
    expect(primaryWeights([0.1, 0.2], [100, 50])).toEqual([0.5, 0.5]);
    expect(primaryWeights([0.11, 0.16], [0, 0])).toEqual([0.5, 0.5]);
    const { crops } = country(
      ['2536', '2537', '2542'],
      [0, 0, 10],
      {
        extraction: { '2542': { '2536': 0.1, '2537': 0.2 } },
      },
      { '2536': 100, '2537': 50 },
    );
    expect(crops.base[0]).toBeCloseTo(50);
    expect(crops.base[1]).toBeCloseTo(25);
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
  it('stops the N₂O of the drained soils the lever rewets or production frees', () => {
    const france = (r: ReturnType<typeof run>) =>
      r.countries.find((c) => c.iso3 === 'FRA') ?? expect.fail('no France');
    const rewet = lever('peatRewetting');
    expect(france(rewet).drainedN2o).toBe(1.5e6);
    expect(france(rewet).drainedN2oChange).toBeCloseTo(-1.5e6, -1);
    expect(rewet.summary.avoided.n2o).toBeGreaterThan(0);
    expect(france(lever('deforestation')).drainedN2oChange).toBe(0);
    const beef = france(run({ groupShifts: { ruminantMeat: 1 } }));
    expect(beef.drainedN2oChange).toBeLessThan(0);
    expect(beef.drainedN2oChange / beef.drainedN2o).toBeCloseTo(
      beef.drainedChange / beef.drainedCo2,
      9,
    );
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
