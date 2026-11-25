import { describe, expect, it } from 'vitest';
import { fishTotal, speciesTotal, type SpeciesTotal } from '../../src/app/species';
import { DEFAULT_OPTIONS, type Options, type Scenario } from '../../src/model/api';
import { runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { speciesAfter, speciesOf, speciesRegained } from '../../src/model/species';
import { CURRENT_YEAR, loadFixtures } from './fixtures';

const factors = { cropland: [2, 5], pasture: [1, 3] } as {
  cropland: [number, number];
  pasture: [number, number];
};
const data = loadFixtures();
const run = (scenario: Partial<Scenario>, options: Partial<Options> = {}) =>
  runScenario(
    data,
    { ...BASE_SCENARIO, ...scenario },
    { ...DEFAULT_OPTIONS, ...options },
    CURRENT_YEAR,
  );

describe('species committed to extinction', () => {
  it('counts today’s farmland at the average factor and land newly farmed at the marginal one', () => {
    const s = speciesOf(factors, { cropland: 10, pasture: 20 }, { cropland: 4, pasture: -6 });
    expect(s.species).toBe(10 * 2 + 20 * 1);
    expect(s.speciesChange).toBe(4 * 5);
  });

  it('gives back the freed land’s species, at the average factor, only through regrowth', () => {
    expect(speciesRegained(factors, { cropland: 4, pasture: -6 })).toBe(6);
    const c = { species: 40, speciesChange: 20 };
    expect(speciesAfter(c)).toBe(60);
    expect(speciesAfter({ ...c, speciesRegained: 6 })).toBe(54);
  });

  it('is none for a country without factors', () => {
    expect(speciesOf(undefined, { cropland: 1, pasture: 1 }, { cropland: 1, pasture: 1 })).toEqual({
      species: 0,
      speciesChange: 0,
    });
    expect(speciesRegained(undefined, { cropland: -1, pasture: -1 })).toBe(0);
  });

  it('falls with a diet shift once freed farmland grows back, and not while it is left as it is', () => {
    const left = speciesTotal(run({ shift: 1 }).countries, data.species) as SpeciesTotal;
    const regrown = speciesTotal(
      run({ shift: 1 }, { regrowth: 'natural' }).countries,
      data.species,
    ) as SpeciesTotal;
    expect(left.after).toBeGreaterThanOrEqual(left.before);
    expect(regrown.after).toBeLessThan(regrown.before);
    expect(regrown.before).toBe(left.before);
  });

  it('leaves the count as it is without a shift, and none without the file', () => {
    const s = speciesTotal(run({ shift: 0 }).countries, data.species);
    expect(s?.after).toBeCloseTo(s?.before ?? 0, 6);
    expect(speciesTotal(run({ shift: 0 }).countries, undefined)).toBeNull();
  });
});

describe('fish against an unfished ocean', () => {
  const country = (production: number, change: number) =>
    ({ production: { seafood: production }, productionChange: { seafood: change } }) as never;
  const fish = { unfished: 3, fished: 1 };

  it('scales the biomass fishing removes with the catch', () => {
    expect(fishTotal([country(10, 0)], fish)).toEqual({
      unfished: 3,
      before: 1,
      after: 1,
      catchChange: 0,
    });
    expect(fishTotal([country(10, -5)], fish)?.after).toBeCloseTo(2, 9);
    expect(fishTotal([country(10, -10)], fish)?.after).toBeCloseTo(3, 9);
  });

  it('is none without seafood or the figures', () => {
    expect(fishTotal([country(0, 0)], fish)).toBeNull();
    expect(fishTotal([country(10, 0)], undefined)).toBeNull();
  });

  it('rises when a diet shift cuts the seafood eaten', () => {
    const f = fishTotal(run({ shift: 1 }).countries, data.species?.fish);
    expect(f?.after).toBeGreaterThan(f?.before ?? Infinity);
  });
});
