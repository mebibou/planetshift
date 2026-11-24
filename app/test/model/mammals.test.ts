import { describe, expect, it } from 'vitest';
import { ANIMAL_GROUPS, type AnimalGroup, type ModelData } from '../../src/data/types';
import { mammalRatio, type MammalRatio } from '../../src/app/mammals';
import { DEFAULT_OPTIONS, type CountryResult, type Scenario } from '../../src/model/api';
import { mammalsOf } from '../../src/model/mammals';
import { runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { recordFrom } from '../../src/model/util';
import { CURRENT_YEAR, loadFixtures } from './fixtures';
import { loadRealData } from './realData';

const NONE = recordFrom(ANIMAL_GROUPS, () => 0);
const changed = (over: Partial<Record<AnimalGroup, number>>) => ({ ...NONE, ...over });

const data = loadFixtures();
const run = (scenario: Partial<Scenario>, d = data) =>
  runScenario(d, { ...BASE_SCENARIO, ...scenario }, DEFAULT_OPTIONS, CURRENT_YEAR);

/** The world's farmed mammals against its wild ones at a shift. */
const ratioAt = (shift: number, d: ModelData) =>
  mammalRatio(run({ shift }, d).countries, d.mammals?.wild) as MammalRatio;

/** A country's relative change in each animal group's production, from its result. */
const groupChange = (c: CountryResult, g: AnimalGroup) =>
  c.production[g] > 0 ? Math.max(-1, c.productionChange[g] / c.production[g]) : 0;

describe('farmed mammals', () => {
  it('adds up the herds and moves each with its food group, those kept for work staying', () => {
    const herds = { dairy: 100, ruminantMeat: 300, pigMeat: 50, other: 20 };
    const m = mammalsOf(herds, changed({ dairy: -0.5, ruminantMeat: -0.2, pigMeat: 0.1 }));
    expect(m.mammals).toBe(470);
    expect(m.mammalsChange).toBeCloseTo(-50 - 60 + 5, 9);
  });

  it('removes a whole herd with its group, and keeps the work animals', () => {
    const m = mammalsOf({ dairy: 10, other: 4 }, changed({ dairy: -1 }));
    expect(m.mammals + m.mammalsChange).toBeCloseTo(4, 9);
  });

  it('does not change without a shift', () => {
    const r = run({ shift: 0 });
    expect(r.countries.find((c) => c.iso3 === 'FRA')?.mammals).toBeCloseTo(8.72e6, -3);
    r.countries.forEach((c) => expect(c.mammalsChange).toBeCloseTo(0, 6));
  });

  it('follows each country’s change in the production of the groups its herds follow', () => {
    const r = run({ shift: 0.6 });
    const herds = data.mammals?.byCountry ?? {};
    r.countries
      .filter((c) => herds[c.iso3])
      .forEach((c) => {
        const own = herds[c.iso3] ?? {};
        const expected = ANIMAL_GROUPS.reduce((s, g) => s + (own[g] ?? 0) * groupChange(c, g), 0);
        expect(c.mammalsChange).toBeLessThan(0);
        expect(c.mammalsChange).toBeCloseTo(expected, 3);
      });
  });

  it('counts none in a country the file leaves out, or without the file', () => {
    expect(run({ shift: 1 }).countries.find((c) => c.iso3 === 'NGA')?.mammals).toBe(0);
    const without = { ...data };
    delete without.mammals;
    run({ shift: 1 }, without).countries.forEach((c) => {
      expect(c.mammals).toBe(0);
      expect(c.mammalsChange).toBe(0);
    });
  });
});

describe('farmed against wild mammals', () => {
  it('divides the world’s farmed mammals by its wild ones, today and with the levers', () => {
    const m = mammalRatio(
      [
        { mammals: 400, mammalsChange: -100 },
        { mammals: 200, mammalsChange: -50 },
      ],
      { land: 20, marine: 40 },
    );
    expect(m).toEqual({ farmedBefore: 600, farmedAfter: 450, wild: 60, before: 10, after: 7.5 });
  });

  it('has no ratio without farmed or wild mammals', () => {
    expect(mammalRatio([{ mammals: 1, mammalsChange: 0 }], undefined)).toBeNull();
    expect(mammalRatio([{ mammals: 0, mammalsChange: 0 }], { land: 1, marine: 1 })).toBeNull();
  });

  it('falls on the fixtures as the herds shrink', () => {
    const before = ratioAt(0, data);
    const after = ratioAt(1, data);
    expect(before.after).toBeCloseTo(before.before, 9);
    expect(after.after).toBeLessThan(after.before);
  });

  const real = loadRealData();
  it.skipIf(!real?.mammals)(
    'is about ten to one today in the real data, as Greenspoon et al. find',
    () => {
      const m = ratioAt(0, real as ModelData);
      expect(m.before).toBeGreaterThan(9);
      expect(m.before).toBeLessThan(12);
      expect(m.wild).toBe(61e6);
    },
  );
});
