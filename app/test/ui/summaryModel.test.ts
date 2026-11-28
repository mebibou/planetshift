import { describe, expect, it } from 'vitest';
import type { Country } from '../../src/data/types';
import {
  gasChange,
  landStat,
  valueAt,
  worldPerCapita,
  causeGroups,
} from '../../src/app/summaryModel';
import { countryResult } from './fakes';

const country = (iso3: string, pop: number): Country => ({
  iso3,
  fao: 1,
  name: { en: iso3, fr: iso3 },
  region: 'World',
  highIncome: false,
  population: { '2022': pop },
});

describe('summary model', () => {
  it('weights per-capita supply by population', () => {
    const r = worldPerCapita(
      [
        countryResult({ iso3: 'A', proteinBefore: 100, proteinAfter: 100 }),
        countryResult({ iso3: 'B', proteinBefore: 50, proteinAfter: 60 }),
      ],
      [country('A', 1), country('B', 3)],
      2022,
    );
    expect(r.proteinBefore).toBeCloseTo(62.5);
    expect(r.proteinAfter).toBeCloseTo(70);
  });

  it('gives zeros without population', () => {
    expect(worldPerCapita([], [], 2022).kcalBefore).toBe(0);
  });

  it('reads a value by year', () => {
    expect(valueAt([2049, 2050], [1, 2], 2050)).toBe(2);
    expect(valueAt([2049, 2050], [1, null], 2050)).toBeNull();
    expect(valueAt([2049], [1], 2050)).toBeNull();
  });
});

describe('gas change', () => {
  it('says avoided for a fall and added for a rise, with a positive value', () => {
    expect(gasChange('ch4', 5)).toEqual({ key: 'summary.ch4', value: 5 });
    expect(gasChange('co2', -8)).toEqual({ key: 'summary.co2Added', value: 8 });
  });
});

describe('land stat', () => {
  const before = { cropland: 300, pasture: 700 };
  it('gives the farmland freed, each part as its change in use, and the world share', () => {
    expect(landStat(before, { cropland: -20, pasture: 220 })).toEqual({
      key: 'summary.landFreed',
      total: 200,
      cropland: 20,
      pasture: -220,
      share: 0.2,
    });
  });
  it('says added when the shift needs more land', () => {
    expect(landStat(before, { cropland: -50, pasture: 0 })).toMatchObject({
      key: 'summary.landAdded',
      total: 50,
      share: 0.05,
    });
    expect(landStat({ cropland: 0, pasture: 0 }, { cropland: 0, pasture: 0 }).share).toBe(0);
  });
});

describe('causeGroups', () => {
  const of = (f: number, a: number, l: number, p = 0) => ({
    fossilIndustry: f,
    agriculture: a,
    landUse: l,
    landAlbedo: 0,
    waste: 0,
    airPollution: p,
    other: 0,
  });
  const none = of(0, 0, 0);
  const zero = {
    diet: none,
    waste: none,
    practices: none,
    deforestation: none,
    regrowth: none,
    removals: none,
    energy: none,
    industry: none,
  };
  it('is empty when a single family acts, whichever causes it acts on', () => {
    expect(causeGroups({ ...zero, diet: of(0, 0.05, 0.01) })).toEqual([]);
    expect(causeGroups({ ...zero, energy: of(0.2, 0, 0) })).toEqual([]);
    expect(causeGroups(zero)).toEqual([]);
  });
  it('groups the families under the causes, biggest first, with one scale for all', () => {
    const groups = causeGroups({
      ...zero,
      diet: of(0, 0.04, 0.01),
      practices: of(0, 0.02, 0),
      deforestation: of(0, 0, 0.03),
      energy: of(0.12, 0, 0),
    });
    expect(groups.map((g) => [g.cause, g.rows.map((r) => r.family)])).toEqual([
      ['fossilIndustry', ['energy']],
      ['agriculture', ['diet', 'practices']],
      ['landUse', ['deforestation', 'diet']],
    ]);
    expect(groups[0]?.width).toBe(1);
    expect(groups[1]?.value).toBeCloseTo(0.06);
    expect(groups[1]?.rows[0]?.width).toBeCloseTo(0.04 / 0.12);
  });
  it('shows the warming the energy levers unmask by cleaning the air as a cause added to', () => {
    const groups = causeGroups({
      ...zero,
      energy: of(0.12, 0, 0, -0.02),
      industry: of(0.03, 0, 0, -0.01),
    });
    expect(groups.map((g) => [g.cause, g.value])).toEqual([
      ['fossilIndustry', expect.closeTo(0.15)],
      ['airPollution', expect.closeTo(-0.03)],
    ]);
  });
  it('puts a cause the levers add to last, its families shown as added', () => {
    const groups = causeGroups({ ...zero, diet: of(0, 0.04, -0.01), waste: of(0, 0.01, 0) });
    expect(groups.map((g) => g.cause)).toEqual(['agriculture', 'landUse']);
    expect(groups[1]?.rows[0]?.value).toBeCloseTo(-0.01);
  });
  it('lists the foods of a family split by food under it, biggest first, on the same scale', () => {
    const foods = {
      diet: {
        ruminantMeat: of(0, 0.03, 0.008),
        dairy: of(0, 0.01, 0.002),
        eggs: of(0, 0.0001, 0),
      },
    };
    const groups = causeGroups({ ...zero, diet: of(0, 0.04, 0.01), energy: of(0.08, 0, 0) }, foods);
    const foodsIn = (cause: string) => groups.find((g) => g.cause === cause)?.rows[0]?.foods ?? [];
    expect(foodsIn('agriculture').map((f) => [f.food, f.value])).toEqual([
      ['ruminantMeat', expect.closeTo(0.03 + 0.0001 * 0.75, 12)],
      ['dairy', expect.closeTo(0.01 + 0.0001 * 0.25, 12)],
    ]);
    expect(foodsIn('agriculture')[0]?.width).toBeCloseTo(0.03 / 0.08);
    expect(foodsIn('fossilIndustry')).toEqual([]);
  });
  it('shows a single family when it has foods to list, and no foods when only one shows', () => {
    const two = { diet: { ruminantMeat: of(0, 0.03, 0), dairy: of(0, 0.01, 0) } };
    expect(causeGroups({ ...zero, diet: of(0, 0.04, 0) }, two)[0]?.rows[0]?.foods).toHaveLength(2);
    const one = { diet: { ruminantMeat: of(0, 0.04, 0) } };
    expect(causeGroups({ ...zero, diet: of(0, 0.04, 0) }, one)).toEqual([]);
  });
  it('lists the four largest foods of a family, then the others added up', () => {
    const values = [0.01, 0.009, 0.008, 0.007, 0.002, 0.001, 0.0001];
    const foods = { waste: Object.fromEntries(values.map((v, k) => [`f${k}`, of(0, v, 0)])) };
    const groups = causeGroups({ ...zero, waste: of(0, 0.0371, 0) }, foods);
    const rows = groups[0]?.rows[0]?.foods ?? [];
    expect(rows.map((r) => r.food)).toEqual(['f0', 'f1', 'f2', 'f3', 'other']);
    expect(rows[4]?.value).toBeCloseTo(0.0031, 12);
  });
  it('shares a rest that adds warming out between the foods of a family that avoids it', () => {
    const values = [0.06, 0.03, 0.01, 0.005, 0.0004, -0.002];
    const foods = { diet: Object.fromEntries(values.map((v, k) => [`f${k}`, of(0, v, 0)])) };
    const rows =
      causeGroups({ ...zero, diet: of(0, 0.1034, 0), energy: of(0.2, 0, 0) }, foods).find(
        (g) => g.cause === 'agriculture',
      )?.rows[0]?.foods ?? [];
    expect(rows.map((r) => r.food)).toEqual(['f0', 'f1', 'f2', 'f3']);
    expect(rows.every((r) => r.value > 0)).toBe(true);
    expect(rows.reduce((s, r) => s + r.value, 0)).toBeCloseTo(0.1034, 12);
  });
});
