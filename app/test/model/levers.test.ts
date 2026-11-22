import { describe, expect, it } from 'vitest';
import { FAMILIES, COUNTED_CAUSES, LEVER_IDS, MODULES } from '../../src/levers/registry';
import { PRACTICES } from '../../src/levers/practices/data';
import { DEFAULT_OPTIONS, type Options, type Scenario } from '../../src/model/api';
import { shapley } from '../../src/model/attribution';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { decodeState, encodeState } from '../../src/model/state';
import { sum } from '../../src/model/util';
import { lever, run } from '../levers';

describe('levers together', () => {
  it('with no shift and no lever, nothing is avoided', () => {
    const r = run();
    expect(r.summary.avoidedWarming2100.median).toBe(0);
    FAMILIES.forEach((f) => expect(r.summary.byFamily.avoidedWarming2100[f]).toBe(0));
  });
  it.each(LEVER_IDS)('%s has a range around its median', (id) => {
    const w = lever(id).summary.avoidedWarming2100;
    expect(w.p05).toBeLessThanOrEqual(w.median);
    expect(w.p95).toBeGreaterThanOrEqual(w.median);
  });
});

const LEVERS_ON = {
  ...Object.fromEntries(PRACTICES.map((p) => [p, 1])),
  foodWaste: 0.5,
  supplyLosses: 0.5,
  deforestation: 1,
  coverCrops: 0.5,
  electricCars: 1,
  flyLess: 0.5,
  cleanHeating: 0.5,
  renewableElectricity: 0.5,
};

describe('the breakdown by family', () => {
  const everything = run({ shift: 0.5, levers: LEVERS_ON }, { regrowth: 'natural' });
  it('adds up to the totals', () => {
    const s = everything.summary;
    const total = (r: Record<string, number>) => sum(Object.values(r));
    expect(total(s.byFamily.avoidedWarming2050)).toBeCloseTo(s.avoidedWarming2050.median, 9);
    expect(total(s.byFamily.avoidedWarming2100)).toBeCloseTo(s.avoidedWarming2100.median, 9);
    expect(total(s.byFamily.avoidedCo2e) / s.avoidedCo2e).toBeCloseTo(1, 9);
    FAMILIES.forEach((f) => expect(s.byFamily.avoidedWarming2100[f], f).toBeGreaterThan(0));
  });
  it('equals the Shapley values of full runs with each family on or off', () => {
    const on = everything;
    const scenario = { shift: 0.5, levers: LEVERS_ON };
    const families = FAMILIES.filter((f) => Math.abs(on.summary.byFamily.avoidedCo2e[f] ?? 0) > 0);
    const offIn = (family: string, s: Partial<Scenario>, o: Partial<Options>) =>
      family === 'diet'
        ? [{ ...s, shift: 0 }, o]
        : family === 'regrowth'
          ? [s, { ...o, regrowth: 'none' }]
          : [
              {
                ...s,
                levers: Object.fromEntries(
                  Object.entries(s.levers ?? {}).filter(
                    ([id]) =>
                      MODULES.find((m) => m.levers.some((l) => l.id === id))?.family !== family,
                  ),
                ),
              },
              o,
            ];
    const exact = shapley(families, (coalition) => {
      const [s, o] = families
        .filter((f) => !coalition.includes(f))
        .reduce<[Partial<Scenario>, Partial<Options>]>(
          ([s1, o1], f) => offIn(f, s1, o1) as [Partial<Scenario>, Partial<Options>],
          [scenario, { regrowth: 'natural' }],
        );
      const r = run(s, o).summary;
      return [r.avoidedWarming2050.median, r.avoidedWarming2100.median, r.avoidedCo2e];
    });
    expect(families.length).toBe(FAMILIES.length);
    families.forEach((f) => {
      const [w50, w100, co2e] = exact.get(f) as number[];
      expect(on.summary.byFamily.avoidedWarming2050[f], f).toBeCloseTo(w50 as number, 9);
      expect(on.summary.byFamily.avoidedWarming2100[f], f).toBeCloseTo(w100 as number, 9);
      expect((on.summary.byFamily.avoidedCo2e[f] as number) / (co2e as number), f).toBeCloseTo(
        1,
        9,
      );
    });
  });
  it('gives the diet alone, with no other family acting, all that is avoided', () => {
    const diet = run({ shift: 0.5 }).summary;
    expect(diet.byFamily.avoidedWarming2050.diet).toBeCloseTo(diet.avoidedWarming2050.median, 12);
  });
  it('splits each family by cause, the causes adding up to the totals', () => {
    const s = everything.summary;
    const total = (r: Record<string, number>) => sum(Object.values(r));
    FAMILIES.forEach((f) =>
      expect(total(s.byFamilyCause.avoidedWarming2100[f] as Record<string, number>), f).toBeCloseTo(
        s.byFamily.avoidedWarming2100[f] as number,
        12,
      ),
    );
    expect(total(s.byCause.avoidedWarming2050)).toBeCloseTo(s.avoidedWarming2050.median, 9);
    expect(total(s.byCause.avoidedWarming2100)).toBeCloseTo(s.avoidedWarming2100.median, 9);
    expect(total(s.byCause.avoidedCo2e) / s.avoidedCo2e).toBeCloseTo(1, 9);
    const { avoided, avoidedByCause, years } = everything.temperature;
    years.forEach((_, i) =>
      expect(sum(COUNTED_CAUSES.map((c) => avoidedByCause[c][i] as number))).toBeCloseTo(
        avoided.median[i] as number,
        9,
      ),
    );
  });
  it('counts the diet in farming and in land use, and the energy levers in fossil fuels', () => {
    const s = everything.summary.byFamilyCause.avoidedWarming2100;
    expect(s.diet?.agriculture).toBeGreaterThan(0);
    expect(Math.abs(s.diet?.landUse ?? 0)).toBeGreaterThan(0);
    expect(s.diet?.fossilIndustry).toBe(0);
    expect(s.energy?.fossilIndustry).toBeGreaterThan(0);
    expect(s.energy?.agriculture).toBe(0);
    expect(s.deforestation?.agriculture).toBe(0);
    expect(s.practices?.landUse).toBe(0);
  });
  it('shares the permafrost change out so the parts still add up', () => {
    const r = run({ shift: 0.5, levers: LEVERS_ON }, { regrowth: 'natural', permafrost: 'on' });
    const total = (rec: Record<string, number>) => sum(Object.values(rec));
    expect(total(r.summary.byFamily.avoidedWarming2100)).toBeCloseTo(
      r.summary.avoidedWarming2100.median,
      9,
    );
    expect(total(r.summary.byCause.avoidedWarming2100)).toBeCloseTo(
      r.summary.avoidedWarming2100.median,
      9,
    );
  });
});

describe('levers in the URL', () => {
  it('round-trip', () => {
    const scenario: Scenario = {
      ...BASE_SCENARIO,
      shift: 0.2,
      levers: { feedAdditives: 0.5, foodWaste: 0.25, deforestation: 1, biochar: 0.125 },
    };
    expect(encodeState(scenario, DEFAULT_OPTIONS)).toBe('shift=20&fa=50&fw=25&df=100&bc=12.5');
    expect(decodeState(encodeState(scenario, DEFAULT_OPTIONS))).toEqual({
      scenario,
      options: DEFAULT_OPTIONS,
    });
  });
  it('read an invalid adoption as none', () => {
    expect(decodeState('fa=150&fw=abc&df=-1&cc=0&ew=30').scenario.levers).toEqual({
      enhancedWeathering: 0.3,
    });
  });
});
