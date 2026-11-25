import { describe, expect, it } from 'vitest';
import { ANIMAL_GROUPS, type GasVector } from '../../src/data/types';
import { DEFAULT_OPTIONS, type Scenario } from '../../src/model/api';
import { footprintOf, importShares, type FootprintFrame } from '../../src/model/footprint';
import type { Prepared, PreparedCountry } from '../../src/model/prepare';
import { runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { CURRENT_YEAR, loadFixtures } from './fixtures';

const v = (...xs: number[]) => Float64Array.from(xs);
const gas = (co2: number): GasVector => ({ co2, ch4: 0, n2o: 0 });
const feedOf = (ruminant: number) =>
  ANIMAL_GROUPS.map((g) => gas(g === 'ruminantMeat' ? ruminant : 0));
const prepared = {
  items: [
    { code: 1, group: 'cereals' },
    { code: 2, group: 'ruminantMeat' },
  ],
} as unknown as Prepared;
const frame: FootprintFrame = {
  consumed: [{ co2: v(10, 150), ch4: v(0, 0), n2o: v(0, 0) }],
  feed: { own: [feedOf(50)], imported: [{ co2: v(0, 80), ch4: v(0, 0), n2o: v(0, 0) }] },
};

describe('the food footprint', () => {
  it('counts what is used at its intensity, and the feed of animal products by where they come from', () => {
    const kg = footprintOf(0, prepared, v(1, 2), v(0, 0.5), frame);
    expect(kg.co2).toBeCloseTo(1 * 10 + 2 * (150 + 0.5 * 50 + 0.5 * 80));
  });

  it('imports all of an item a country does not produce, and none without a row', () => {
    const pc = {
      rows: new Map([
        ['1', { production: 30, imports: 10 }],
        ['2', { production: 0, imports: 5 }],
      ]),
    } as unknown as PreparedCountry;
    expect(Array.from(importShares(pc, prepared))).toEqual([0.25, 1]);
    const none = { rows: new Map() } as unknown as PreparedCountry;
    expect(Array.from(importShares(none, prepared))).toEqual([0, 0]);
  });
});

describe('the food footprint in a run', () => {
  const data = loadFixtures();
  const run = (scenario: Partial<Scenario>) =>
    runScenario(data, { ...BASE_SCENARIO, ...scenario }, DEFAULT_OPTIONS, CURRENT_YEAR);
  const fra = (scenario: Partial<Scenario>) =>
    run(scenario).countries.find((c) => c.iso3 === 'FRA')!;

  it('gives each country a footprint per person, unchanged without levers', () => {
    const c = fra({ shift: 0 });
    expect(c.footprint!.co2).toBeGreaterThan(0);
    expect(c.footprintChange!.co2).toBeCloseTo(0, 6);
  });

  it('falls with a diet shift and with the farm practices', () => {
    expect(fra({ shift: 1 }).footprintChange!.ch4).toBeLessThan(0);
    const practices = fra({ shift: 0, levers: { feedAdditives: 1 } });
    expect(practices.footprintChange!.ch4).toBeLessThan(0);
    expect(practices.footprintChange!.co2).toBeCloseTo(0, 6);
  });

  it('takes an import’s intensity from where it comes from, the world’s without origins', () => {
    const co2e = (c: { footprint?: { co2: number; ch4: number; n2o: number } }) =>
      c.footprint!.co2 + 27 * c.footprint!.ch4 + 273 * c.footprint!.n2o;
    const withOrigins = runScenario(data, BASE_SCENARIO, DEFAULT_OPTIONS, CURRENT_YEAR);
    const without = runScenario(
      { ...data, origins: undefined },
      BASE_SCENARIO,
      DEFAULT_OPTIONS,
      CURRENT_YEAR,
    );
    const fra = (r: typeof without) => r.countries.find((c) => c.iso3 === 'FRA')!;
    const usa = (r: typeof without) => r.countries.find((c) => c.iso3 === 'USA')!;
    expect(co2e(fra(withOrigins))).not.toBeCloseTo(co2e(fra(without)), 3);
    expect(co2e(usa(withOrigins))).toBeCloseTo(co2e(usa(without)), 9);
  });
});
