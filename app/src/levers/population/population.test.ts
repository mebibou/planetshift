import { describe, expect, it } from 'vitest';
import { data, run, w2050, w2100 } from '../../../test/levers';
import { loadRealData } from '../../../test/model/realData';
import { CURRENT_YEAR } from '../../../test/model/fixtures';
import { DEFAULT_OPTIONS, type Options, type ScenarioResult } from '../../model/api';
import { prepare } from '../../model/prepare';
import { runScenario } from '../../model/run';
import { BASE_SCENARIO } from '../../model/scenarios';
import { sum } from '../../model/util';
import { variantRatio, variantWorldPopulation, VARIANTS } from './model';

const pop = data.population;
const baselineIn = (r: ScenarioResult, year: number) =>
  r.temperature.baseline.median[year - (r.temperature.years[0] as number)] as number;
const emissionsIn = (r: ScenarioResult, year: number) =>
  r.baselineEmissions[r.years.indexOf(year)]!.ch4;

describe('world population', () => {
  it('takes each country’s ratio, from 1 at the last estimate, or the world’s', () => {
    expect(variantRatio(pop, 'FRA', 'low', pop.lastEstimate)).toBe(1);
    expect(variantRatio(pop, 'FRA', 'medium', 2100)).toBe(1);
    expect(variantRatio(pop, 'FRA', 'low', 2100)).toBe(pop.byCountry.FRA!.low.at(-1));
    const [y0, y1] = [pop.ratioYears[2]!, pop.ratioYears[3]!];
    const [r0, r1] = [pop.byCountry.FRA!.high[2]!, pop.byCountry.FRA!.high[3]!];
    expect(variantRatio(pop, 'FRA', 'high', (y0 + y1) / 2)).toBeCloseTo((r0 + r1) / 2, 9);
    const world = pop.world;
    const i = world.medium.years.indexOf(2080);
    expect(variantRatio(pop, 'NGA', 'low', 2080)).toBeCloseTo(
      world.low.values[i]! / world.medium.values[i]!,
      9,
    );
  });

  it('the medium variant is the countries’ own population', () => {
    const prepared = prepare(data);
    expect(variantWorldPopulation(data.countries, pop, 'medium', prepared.baseYear)).toEqual(
      prepared.worldPopulation,
    );
  });

  it('low < medium < high: farm emissions and temperature in the baseline, and what a shift avoids', () => {
    const [low, medium, high] = (['low', 'medium', 'high'] as const).map((population) =>
      run({ shift: 0.5 }, { population }),
    ) as [ScenarioResult, ScenarioResult, ScenarioResult];
    [2050, 2100].forEach((y) => {
      expect(emissionsIn(low, y)).toBeLessThan(emissionsIn(medium, y));
      expect(emissionsIn(medium, y)).toBeLessThan(emissionsIn(high, y));
      expect(baselineIn(low, y)).toBeLessThan(baselineIn(medium, y));
      expect(baselineIn(medium, y)).toBeLessThan(baselineIn(high, y));
    });
    expect(w2100(low)).toBeLessThan(w2100(medium));
    expect(w2100(medium)).toBeLessThan(w2100(high));
    expect(w2050(low)).toBeLessThan(w2050(high));
    expect(baselineIn(low, 1990)).toBe(baselineIn(high, 1990));
    const s = high.summary;
    expect(sum(Object.values(s.byFamily.avoidedWarming2100))).toBeCloseTo(
      s.avoidedWarming2100.median,
      9,
    );
  });

  it('changes nothing with the SSP2 path for farm emissions', () => {
    const [low, medium] = (['low', 'medium'] as const).map((population) =>
      run({ shift: 0.5 }, { population, baseline: 'ssp2' }),
    ) as [ScenarioResult, ScenarioResult];
    expect(low.temperature).toEqual(medium.temperature);
  });

  it('gives the temperature chart the history, the three variants and the one chosen', () => {
    const r = run({}, { population: 'high' });
    expect(r.population?.variant).toBe('high');
    expect(r.population?.history.years[0]).toBe(1850);
    expect(Object.keys(r.population?.variants ?? {})).toEqual([...VARIANTS]);
    expect(
      runScenario(
        {
          ...data,
          population: { ...pop, world: { ...pop.world, medium: { years: [], values: [] } } },
        },
        BASE_SCENARIO,
        DEFAULT_OPTIONS,
        CURRENT_YEAR,
      ).population,
    ).toBeNull();
  });
});

const real = loadRealData();

describe.skipIf(real === null)('world population on the real data', () => {
  const realData = real as NonNullable<typeof real>;
  const at = (population: Options['population'], shift: number) =>
    runScenario(
      realData,
      { ...BASE_SCENARIO, shift },
      { ...DEFAULT_OPTIONS, population },
      CURRENT_YEAR,
    );

  it('moves the 2100 baseline by about a tenth of a degree and the avoided warming by about a fifth', () => {
    const rows = VARIANTS.map((v) => {
      const r = at(v, 0.5);
      return {
        v,
        b2050: baselineIn(r, 2050),
        b2100: baselineIn(r, 2100),
        a2050: w2050(r),
        a2100: w2100(r),
      };
    });
    console.table(rows);
    const [medium, low, high] = rows as [(typeof rows)[0], (typeof rows)[0], (typeof rows)[0]];
    expect(medium.b2100 - low.b2100).toBeGreaterThan(0.04);
    expect(medium.b2100 - low.b2100).toBeLessThan(0.15);
    expect(high.b2100 - medium.b2100).toBeGreaterThan(0.04);
    expect(high.b2100 - medium.b2100).toBeLessThan(0.15);
    expect(low.a2100 / medium.a2100).toBeGreaterThan(0.7);
    expect(high.a2100 / medium.a2100).toBeLessThan(1.35);
    expect(Math.abs(high.b2050 - low.b2050)).toBeLessThan(0.05);
  });
});
