import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS, type Scenario } from '../../src/model/api';
import { chainEmissions, chainIntensities } from '../../src/model/chain';
import { prepare } from '../../src/model/prepare';
import { runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { CURRENT_YEAR, loadFixtures } from './fixtures';

const data = loadFixtures();
const prepared = prepare(data);
const countryOf = (iso3: string) => prepared.countries.find((c) => c.country.iso3 === iso3)!;
const indexOf = (code: number) => prepared.items.findIndex((i) => i.code === code);
const run = (scenario: Partial<Scenario>, d = data) =>
  runScenario(d, { ...BASE_SCENARIO, ...scenario }, DEFAULT_OPTIONS, CURRENT_YEAR);

describe('food’s emissions after the farm', () => {
  it('weighs a shared stage by Poore & Nemecek and cooking and waste by mass', () => {
    const ints = chainIntensities(countryOf('FRA'), prepared, data.chain!);
    const beef = indexOf(2731);
    expect(ints.fossilIndustry.co2[beef]).toBeCloseTo(350 * 1.8 + 420 * 0.5 + 30);
    expect(ints.other.ch4[beef]).toBeCloseTo(3.8);
    expect(ints.fossilIndustry.ch4[beef]).toBe(0);
  });

  it('takes the world’s factors for a country without figures, and none for an item without weights', () => {
    const ints = chainIntensities(countryOf('IND'), prepared, data.chain!);
    expect(ints.fossilIndustry.co2[indexOf(2511)]).toBeCloseTo(350 * 0.2 + 260 * 0.1 + 160);
    const other = prepared.items.findIndex((i) => ![2511, 2731, 2848].includes(i.code));
    expect(ints.fossilIndustry.co2[other]).toBeCloseTo(160);
  });

  it('sums tonnes times intensities', () => {
    const t = Float64Array.from([2, 3]);
    const g = {
      co2: Float64Array.from([10, 1]),
      ch4: Float64Array.from([0, 1]),
      n2o: Float64Array.from([0, 0]),
    };
    expect(chainEmissions(t, g)).toEqual({ co2: 23, ch4: 3, n2o: 0 });
  });

  it('counts a diet shift’s chain in fossil fuels and industry and in other human emissions', () => {
    const r = run({ shift: 1 });
    const byCause = r.summary.byCause.avoidedCo2e;
    expect(byCause.fossilIndustry).toBeGreaterThan(0);
    expect(byCause.other).toBeGreaterThan(0);
    const without = run({ shift: 1 }, { ...data, chain: undefined });
    expect(without.summary.byCause.avoidedCo2e.other).toBe(0);
    expect(r.summary.avoidedCo2e).toBeGreaterThan(without.summary.avoidedCo2e);
  });

  it('gives each country its chain today and its change, none without the file', () => {
    const fra = run({ shift: 1 }).countries.find((c) => c.iso3 === 'FRA')!;
    expect(fra.chain!.co2).toBeGreaterThan(0);
    expect(fra.chainChange!.co2).toBeLessThan(0);
    const without = run({ shift: 1 }, { ...data, chain: undefined });
    expect(without.countries[0]?.chain).toBeUndefined();
  });
});
