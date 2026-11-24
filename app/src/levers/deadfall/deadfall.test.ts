import { describe, expect, it } from 'vitest';
import { data, run, w2050, w2100 } from '../../../test/levers';
import { loadRealData } from '../../../test/model/realData';
import { DEFAULT_OPTIONS } from '../../model/api';
import { prepare } from '../../model/prepare';
import { runScenario } from '../../model/run';
import { BASE_SCENARIO } from '../../model/scenarios';
import { builtUp, ramp } from '../../model/timePath';
import { range, sum } from '../../model/util';
import { deadfallCo2, stepParts, storedPerTonne } from './model';

const LESS_FISH = { groupShifts: { seafood: 1 } };
const years = range(2026, 2100);

describe('deadfall per tonne', () => {
  it('reads each country’s kg of CO₂ per tonne of the item, none where it has no data', () => {
    const prepared = prepare(data);
    const fra = prepared.countries.find((pc) => pc.country.iso3 === 'FRA')!;
    const bra = prepared.countries.find((pc) => pc.country.iso3 === 'BRA')!;
    const pelagic = prepared.items.findIndex((i) => i.code === 2763);
    expect(storedPerTonne(fra, prepared)[pelagic]).toBe(80);
    expect(sum(Array.from(storedPerTonne(bra, prepared)))).toBe(0);
  });

  it('stores CO₂ as the catch falls and forgoes it as the catch rises', () => {
    const perTonne = Float64Array.from([80, 0]);
    expect(deadfallCo2(Float64Array.from([-1000, -50]), perTonne)).toBe(-80_000);
    expect(deadfallCo2(Float64Array.from([10, 0]), perTonne)).toBe(800);
  });

  it('gives each production step its own part, adding up to the whole', () => {
    const perTonne = Float64Array.from([10]);
    const parts = stepParts([Float64Array.from([-100]), Float64Array.from([-130])], perTonne);
    expect(parts).toEqual([-1000, -300]);
  });
});

describe('the build-up', () => {
  it('follows a step in the share with a 10-year time constant', () => {
    const step = (y: number) => (y >= 2030 ? 1 : 0);
    const share = builtUp(step, years, 10);
    expect(share(2029)).toBe(0);
    expect(share(2030)).toBe(0);
    expect(share(2040)).toBeCloseTo(1 - Math.exp(-1));
    expect(share(2060)).toBeCloseTo(1 - Math.exp(-3));
    expect(share(2100)).toBeCloseTo(1 - Math.exp(-7));
  });

  it('lags a ramp and never runs ahead of it', () => {
    const shareAt = (y: number) => (y < 2026 ? 0 : ramp(y, 2026, 2035));
    const share = builtUp(shareAt, years, 10);
    years.forEach((y) => expect(share(y)).toBeLessThanOrEqual(shareAt(y)));
    expect(share(2035)).toBeLessThan(0.7);
    expect(share(2100)).toBeCloseTo(1, 2);
  });
});

describe('the option', () => {
  it('changes nothing when off', () => {
    const off = run(LESS_FISH);
    const none = run(LESS_FISH, { deadfall: 'off' });
    expect(none.summary).toEqual(off.summary);
    expect(off.countries.every((c) => c.deadfallCo2 === undefined)).toBe(true);
  });

  it('when on, stores CO₂ as fish are shifted, credited to the diet, building up over time', () => {
    const off = run(LESS_FISH);
    const on = run(LESS_FISH, { deadfall: 'on' });
    const stored = -sum(on.countries.map((c) => c.deadfallCo2 ?? 0));
    expect(stored).toBeGreaterThan(0);
    expect(on.summary.avoided.co2 - off.summary.avoided.co2).toBeGreaterThan(0);
    expect(on.summary.avoided.co2 - off.summary.avoided.co2).toBeLessThan(stored);
    expect(on.summary.avoided.ch4).toBe(off.summary.avoided.ch4);
    expect(w2100(on)).toBeGreaterThan(w2100(off));
    expect(w2050(on)).toBeGreaterThan(w2050(off));
    const diet = (r: typeof on) => r.summary.byFamily.avoidedWarming2100.diet ?? 0;
    expect(diet(on) - diet(off)).toBeCloseTo(w2100(on) - w2100(off), 12);
  });

  it('avoids nothing without a change in catch', () => {
    expect(run({}, { deadfall: 'on' }).summary).toEqual(run({}).summary);
  });
});

const real = loadRealData();

describe.skipIf(real === null)('deadfall on the real data', () => {
  const runReal = (deadfall: 'on' | 'off') =>
    runScenario(real!, { ...BASE_SCENARIO, ...LESS_FISH }, { ...DEFAULT_OPTIONS, deadfall }, 2026);

  it('stores under 1% of seafood’s emissions, about a thousandth of a degree at most', () => {
    const off = runReal('off');
    const on = runReal('on');
    const stored = -sum(on.countries.map((c) => c.deadfallCo2 ?? 0));
    expect(stored).toBeGreaterThan(0.5e9);
    expect(stored).toBeLessThan(0.01 * 236e9);
    expect(w2100(on) - w2100(off)).toBeGreaterThan(0);
    expect(w2100(on) - w2100(off)).toBeLessThan(0.002);
  });
});
