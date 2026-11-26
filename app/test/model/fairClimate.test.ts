import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FairFile, GasVector } from '../../src/data/types';
import {
  ensembleOf,
  fairBaseline,
  fairScenario,
  scenarioBands,
  withChanges,
} from '../../src/model/fairClimate';
import { runMember } from '../../src/model/fair/member';
import { prepareScenario } from '../../src/model/fair/scenario';
import { scaledTo } from '../../src/model/run';
import { ZERO_GAS } from '../../src/model/util';

/** The FaIR port's fixture (three members, a made-up scenario) as fair.json would hold it. */
const fixture = JSON.parse(readFileSync(join(__dirname, 'fair/fixture.json'), 'utf8'));
const STEPS = (fixture.landUse as number[]).length;
const input = {
  emissions: Object.fromEntries(
    Object.entries(fixture.emissions as Record<string, number | number[]>).map(([s, v]) => [
      s,
      typeof v === 'number' ? new Array<number>(STEPS).fill(v) : v,
    ]),
  ),
  landUse: fixture.landUse as number[],
};
const file = {
  ...fixture.calibration,
  doi: '',
  licence: '',
  ssp: { ssp126: input, ssp245: input, ssp370: input },
} as FairFile;
const ensemble = ensembleOf(file);
const FROM = 2026;
const years = Array.from({ length: 2100 - 1850 + 1 }, (_, i) => 1850 + i);
const cut = (co2: number, ch4: number): GasVector[] =>
  Array.from({ length: 2100 - FROM + 1 }, () => ({ ...ZERO_GAS, co2, ch4 }));

describe('FaIR in the model', () => {
  it('adds a change in kg to FaIR’s units, never taking methane below zero', () => {
    const changed = withChanges(input, [cut(-1e12, -1e15)], FROM);
    const at = FROM - 1750;
    expect(changed.emissions['CO2 FFI']?.[at]).toBeCloseTo(
      (input.emissions['CO2 FFI']?.[at] as number) - 1,
      9,
    );
    expect(changed.emissions.CH4?.[at]).toBe(0);
    expect(changed.emissions.N2O).toBe(input.emissions.N2O);
    expect(changed.emissions['CO2 FFI']?.[at - 1]).toBe(input.emissions['CO2 FFI']?.[at - 1]);
  });

  it('runs a baseline from the shared history to the same bits as one run from 1750', () => {
    const other = { ...input, landUse: input.landUse.map((v, t) => (t >= 300 ? v * 2 : v)) };
    fairBaseline(ensemble, input, FROM);
    const shared = fairBaseline(ensemble, other, FROM);
    const prepared = prepareScenario(ensemble.model, other, STEPS);
    ensemble.members.forEach((m, k) =>
      expect(Array.from(shared.temperature[k] as Float64Array)).toEqual(
        Array.from(runMember(ensemble.model, m, prepared).temperature),
      ),
    );
  });

  it('carries a scenario on from the baseline to the same bits as a run from 1750', () => {
    const baseline = fairBaseline(ensemble, input, FROM);
    const change = cut(-5e12, -5e10);
    const carried = fairScenario(ensemble, baseline, change);
    const whole = fairBaseline(ensemble, withChanges(input, [change], FROM), FROM);
    carried.temperature.forEach((t, k) =>
      expect(Array.from(t)).toEqual(Array.from(whole.temperature[k] as Float64Array)),
    );
    carried.co2.forEach((c, k) =>
      expect(Array.from(c)).toEqual(Array.from(whole.co2[k] as Float64Array)),
    );
  });

  it('avoids nothing without a change, and some warming with less CO₂ and methane', () => {
    const baseline = fairBaseline(ensemble, input, FROM);
    const still = scenarioBands(ensemble, baseline, cut(0, 0), years);
    expect(still.avoided.median.every((v) => v === 0)).toBe(true);
    const cutting = scenarioBands(ensemble, baseline, cut(-5e12, -5e10), years);
    const i = 2100 - 1850;
    expect(cutting.avoided.p05[i]).toBeGreaterThan(0);
    expect(cutting.avoided.median[i]).toBeGreaterThanOrEqual(cutting.avoided.p05[i] as number);
    expect(cutting.avoided.median[FROM - 1 - 1850]).toBe(0);
    expect(cutting.co2.median[i]).toBeLessThan(still.co2.median[i] as number);
  });

  it('shares a total out in proportion to the parts', () => {
    expect(scaledTo([1, 3], 8)).toEqual([2, 6]);
    expect(scaledTo([0, 0], 1)).toEqual([0, 0]);
  });
});
