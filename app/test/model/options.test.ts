import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS, GWP100, type Options, type Scenario } from '../../src/model/api';
import { runScenario } from '../../src/model/run';
import { BASE_SCENARIO } from '../../src/model/scenarios';
import { CURRENT_YEAR, loadFixtures } from './fixtures';

const data = loadFixtures();
const SHIFT: Scenario = { ...BASE_SCENARIO, shift: 0.3 };
const run = (options: Partial<Options>, scenario: Partial<Scenario> = {}) =>
  runScenario(data, { ...SHIFT, ...scenario }, { ...DEFAULT_OPTIONS, ...options }, CURRENT_YEAR);
const worldEmissions = (r: ReturnType<typeof run>) =>
  r.countries.reduce(
    (a, c) => a + c.emissions.co2 + c.emissions.ch4 * 27 + c.emissions.n2o * 273,
    0,
  );
const last = <T>(xs: T[]) => xs[xs.length - 1] as T;

describe('options', () => {
  it('scope: cradle to farm gate adds upstream CO₂', () => {
    const farm = run({ scope: 'farmGate' });
    const cradle = run({ scope: 'cradleToFarmGate' });
    expect(worldEmissions(cradle)).toBeGreaterThan(worldEmissions(farm));
    expect(cradle.summary.avoided.co2).toBeGreaterThan(farm.summary.avoided.co2);
  });
  it('feed: the two allocations change feed crops differently', () => {
    const maize = (r: ReturnType<typeof run>) =>
      r.countries.reduce((a, c) => a + c.productionChange.cereals, 0);
    expect(maize(run({ feed: 'species' }, { groupShifts: { dairy: 0.8 } }))).not.toBeCloseTo(
      maize(run({ feed: 'gleam' }, { groupShifts: { dairy: 0.8 } })),
      -3,
    );
  });
  it('baseline: population and SSP2 paths differ, and equal the base year where they start', () => {
    const pop = run({ baseline: 'population' });
    const ssp = run({ baseline: 'ssp2' });
    expect(last(pop.baselineEmissions).ch4).not.toBeCloseTo(last(ssp.baselineEmissions).ch4, -6);
    expect(last(ssp.baselineEmissions).ch4).toBeGreaterThan(pop.baselineEmissions[0]!.ch4 * 0.9);
    expect(last(pop.temperature.baseline.median)).not.toBe(last(ssp.temperature.baseline.median));
  });
  it('location: fixed trade and domestic move production in different countries', () => {
    const a = run({ location: 'fixedTrade' }).countries.map((c) => c.productionChange.dairy);
    const b = run({ location: 'domestic' }).countries.map((c) => c.productionChange.dairy);
    expect(a).not.toEqual(b);
  });
  it('temperature: each source gives its own observed series, null past its end', () => {
    const had = run({ temperature: 'hadcrut5' }).temperature;
    const ber = run({ temperature: 'berkeley' }).temperature;
    const i2020 = had.years.indexOf(2020);
    expect(had.observed[i2020]).not.toBe(ber.observed[i2020]);
    expect(had.observed[had.years.indexOf(2025)]).toBeNull();
    expect(ber.observed[ber.years.indexOf(2025)]).not.toBeNull();
    expect(last(had.observed)).toBeNull();
  });
  it('climate: FaIR has a range, the AR6 fallback a single curve', () => {
    const fair = run({ climate: 'fair' }).summary.avoidedWarming2050;
    const ar6 = run({ climate: 'ar6' }).summary.avoidedWarming2050;
    expect(fair.p95).toBeGreaterThan(fair.p05);
    expect(ar6.p05).toBe(ar6.median);
    expect(ar6.p95).toBe(ar6.median);
    expect(ar6.median).not.toBe(fair.median);
  });
  it('ssp: the baseline temperature follows the chosen scenario', () => {
    const t = (ssp: Options['ssp']) => last(run({ ssp }).temperature.baseline.median);
    expect(t('ssp126')).toBeLessThan(t('ssp245'));
    expect(t('ssp245')).toBeLessThan(t('ssp370'));
  });
  it('the shift lowers the scenario curve below the baseline in 2050', () => {
    const r = run({});
    expect(last(r.temperature.scenario.median)).toBeLessThan(last(r.temperature.baseline.median));
  });
  it('the summary counts avoided emissions when the shift is complete, CO₂e with GWP100', () => {
    const r = run({}, { rampEnd: 2030 });
    const i = r.years.indexOf(2030);
    expect(r.summary.avoided.ch4).toBeCloseTo(
      r.baselineEmissions[i]!.ch4 - r.scenarioEmissions[i]!.ch4,
      0,
    );
    expect(r.summary.avoidedCo2e).toBeCloseTo(
      r.summary.avoided.co2 +
        r.summary.avoided.ch4 * GWP100.ch4 +
        r.summary.avoided.n2o * GWP100.n2o,
      0,
    );
  });
  it('the ramp shapes the emissions gap', () => {
    const r = run({}, { rampEnd: 2036 });
    const gap = r.years.map((_, i) => r.baselineEmissions[i]!.ch4 - r.scenarioEmissions[i]!.ch4);
    expect(gap[0]).toBe(0);
    const full = gap[r.years.indexOf(2036)]!;
    const half = gap[r.years.indexOf(2031)]!;
    expect(half / full).toBeGreaterThan(0.45);
    expect(half / full).toBeLessThan(0.55);
  });
});
