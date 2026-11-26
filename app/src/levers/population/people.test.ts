import { describe, expect, it } from 'vitest';
import { CURRENT_YEAR, data, run, w2100 } from '../../../test/levers';
import { loadRealData } from '../../../test/model/realData';
import { DEFAULT_OPTIONS, type ScenarioResult } from '../../model/api';
import { prepare } from '../../model/prepare';
import { runScenario } from '../../model/run';
import { BASE_SCENARIO } from '../../model/scenarios';
import { decodeState, encodeState } from '../../model/state';
import { peopleKey, peopleMarks } from '../../ui/PeopleControl';
import {
  BILLION,
  PEOPLE_YEAR,
  peopleFactor,
  peoplePath,
  sspPopulation,
  variantPeople,
} from './people';

const baselineIn = (r: ScenarioResult, year: number) =>
  r.temperature.baseline.median[year - (r.temperature.years[0] as number)] as number;
const farmIn = (r: ScenarioResult, year: number) => r.baselineEmissions[r.years.indexOf(year)]!;

describe('the people-on-Earth path', () => {
  const medium = prepare(data).worldPopulation;

  it('keeps the countries’ own to the current year, goes straight to the number, then holds it', () => {
    const path = peoplePath(medium, 4 * BILLION, CURRENT_YEAR);
    expect(path[CURRENT_YEAR]).toBe(medium[CURRENT_YEAR]);
    expect(path[PEOPLE_YEAR]).toBeCloseTo(4 * BILLION, 0);
    expect(path[2100]).toBeCloseTo(4 * BILLION, 0);
    const middle = (CURRENT_YEAR + PEOPLE_YEAR) / 2;
    expect(path[middle]).toBeCloseTo(((medium[CURRENT_YEAR] as number) + 4 * BILLION) / 2, 0);
  });

  it('scales nothing up to the current year, then the people over the medium projection', () => {
    const path = peoplePath(medium, 0, CURRENT_YEAR);
    const f = peopleFactor(medium, path, CURRENT_YEAR);
    expect(f(CURRENT_YEAR)).toBe(1);
    expect(f(PEOPLE_YEAR)).toBe(0);
    expect(f(2040)).toBeGreaterThan(0);
    expect(f(2040)).toBeLessThan(1);
  });
});

describe('people per person of the SSP', () => {
  it('takes the SSP’s own population to today’s count, so the people chosen scale it from now', () => {
    const path = peoplePath(prepare(data).worldPopulation, 4 * BILLION, CURRENT_YEAR);
    const own = sspPopulation(data.people, 'ssp370', 2022, CURRENT_YEAR, path)!;
    expect(own[CURRENT_YEAR]).toBeCloseTo(path[CURRENT_YEAR] as number, 0);
    const growth = (s: number[], y: number) =>
      (s[data.people.years.indexOf(y)] as number) /
      (s[data.people.years.indexOf(CURRENT_YEAR)] as number);
    expect((own[2100] as number) / (own[CURRENT_YEAR] as number)).toBeCloseTo(
      growth(data.people.population!.ssp370!, 2100),
      6,
    );
    expect(
      sspPopulation({ ...data.people, population: {} }, 'ssp370', 2022, CURRENT_YEAR, path),
    ).toBeNull();
  });

  it('cuts the fast-growing SSP3-7.0 more than SSP1-2.6 for the same number of people', () => {
    const cut = (ssp: 'ssp126' | 'ssp370') =>
      baselineIn(run({}, { ssp }), 2100) - baselineIn(run({}, { ssp, people: 8 }), 2100);
    expect(cut('ssp370')).toBeGreaterThan(cut('ssp126'));
  });
});

describe('people on Earth in the model', () => {
  it('changes nothing while it is not set', () =>
    expect(run({}, { people: undefined })).toEqual(run()));

  it('with none left, farm emissions stop by 2050 and the warming falls below the medium projection’s', () => {
    const none = run({}, { people: 0 });
    const base = run();
    expect(farmIn(none, PEOPLE_YEAR).ch4).toBeCloseTo(0, 6);
    expect(farmIn(none, 2100).n2o).toBeCloseTo(0, 6);
    expect(baselineIn(none, 2100)).toBeLessThan(baselineIn(base, 2100) - 0.3);
    expect(baselineIn(none, CURRENT_YEAR)).toBeCloseTo(baselineIn(base, CURRENT_YEAR), 9);
  });

  it('warms at first as the cooling air pollution goes, then cools', () => {
    const none = run({}, { people: 0 });
    const base = run();
    const delta = (y: number) => baselineIn(none, y) - baselineIn(base, y);
    expect(Math.max(...[2030, 2032, 2034, 2036].map(delta))).toBeGreaterThan(0);
    expect(delta(2100)).toBeLessThan(delta(PEOPLE_YEAR));
  });

  it('takes fewer people off farming and air pollution', () => {
    const none = run({}, { people: 0 });
    const base = run();
    const i = 2100 - (none.temperature.years[0] as number);
    const change = (r: ScenarioResult, c: 'agriculture' | 'airPollution') =>
      r.temperature.baselineChange!.byCause[c]![i] as number;
    expect(change(none, 'agriculture')).toBeLessThan(change(base, 'agriculture'));
    expect(change(none, 'airPollution')).toBeGreaterThan(change(base, 'airPollution'));
  });

  it('orders the warming by the number of people, and more people than the medium warm more', () => {
    const at = [0, 4, 8.2, 10.4].map((people) => baselineIn(run({}, { people }), 2100));
    at.slice(1).forEach((v, k) => expect(v).toBeGreaterThan(at[k] as number));
    expect(at[3]).toBeGreaterThan(baselineIn(run(), 2100));
  });

  it('applies whatever the baseline option, and the levers act on what is left', () => {
    expect(baselineIn(run({}, { people: 0, baseline: 'ssp2' }), 2100)).toBeCloseTo(
      baselineIn(run({}, { people: 0 }), 2100),
      9,
    );
    const levers = { electricCars: 1, renewableElectricity: 1 };
    expect(w2100(run({ levers }, { people: 4 }))).toBeLessThan(w2100(run({ levers })));
    expect(w2100(run({ shift: 0.5 }, { people: 4 }))).toBeLessThan(w2100(run({ shift: 0.5 })));
  });

  it('draws the path behind the temperature chart and ignores the UN projection', () => {
    const r = run({}, { people: 4, population: 'high' });
    expect(r.population?.people?.values.at(-1)).toBeCloseTo(4 * BILLION, 0);
    expect(r.population?.variant).toBe('medium');
    expect(baselineIn(r, 2100)).toBeCloseTo(baselineIn(run({}, { people: 4 }), 2100), 9);
  });
});

describe('the people-on-Earth control', () => {
  it('keeps the number in the URL and reads it back, ignoring an invalid one', () => {
    const query = encodeState(BASE_SCENARIO, { ...DEFAULT_OPTIONS, people: 6.25 });
    expect(query).toBe('ppl=6.25');
    expect(decodeState(query).options.people).toBe(6.25);
    ['-1', 'abc', ''].forEach((raw) =>
      expect(decodeState(`ppl=${raw}`).options).toEqual(DEFAULT_OPTIONS),
    );
  });

  it('marks the UN projections for 2050 from the data, and steps by tenths and marks', () => {
    const marks = peopleMarks(data.population);
    expect(marks.map((m) => m.variant)).toEqual(['low', 'medium', 'high']);
    expect(marks[1]?.value).toBeCloseTo(variantPeople(data.population, 'medium') / BILLION, 2);
    const stops = [0, ...marks.map((m) => m.value)];
    expect(peopleKey('ArrowRight', 6.25, stops)).toBe(6.3);
    expect(peopleKey('ArrowLeft', 6.25, stops)).toBe(6.2);
    expect(peopleKey('ArrowUp', 6.3, stops)).toBe(6.4);
    expect(peopleKey('PageUp', 0, stops)).toBe(marks[0]?.value);
    expect(peopleKey('PageDown', marks[0]?.value as number, stops)).toBe(0);
    expect(peopleKey('Home', 5, stops)).toBeUndefined();
  });
});

const real = loadRealData();

describe.skipIf(real === null)('people on Earth on the real data', () => {
  const realData = real as NonNullable<typeof real>;
  const at = (people?: number, rampEnd = PEOPLE_YEAR) =>
    runScenario(
      realData,
      { ...BASE_SCENARIO, rampEnd },
      { ...DEFAULT_OPTIONS, people },
      CURRENT_YEAR,
    );

  it('with none left by 2050: a small bump from cleaner air, a peak in 2050, then a slow fall', () => {
    const [none, base] = [at(0), at()];
    const years = Array.from({ length: 2100 - CURRENT_YEAR + 1 }, (_, i) => CURRENT_YEAR + i);
    const delta = years.map((y) => baselineIn(none, y) - baselineIn(base, y));
    const bump = Math.max(...delta);
    expect(bump).toBeGreaterThan(0.01);
    expect(bump).toBeLessThan(0.1);
    expect(years[delta.indexOf(bump)]).toBeLessThan(2045);
    const peak = years.reduce((a, y) => (baselineIn(none, y) > baselineIn(none, a) ? y : a));
    expect(Math.abs(peak - PEOPLE_YEAR)).toBeLessThanOrEqual(2);
    expect(baselineIn(none, 2100)).toBeLessThan(baselineIn(none, PEOPLE_YEAR));
    expect(baselineIn(none, 2100)).toBeGreaterThan(baselineIn(none, PEOPLE_YEAR) - 0.4);
  });

  it('reaches its number of people in the year every lever is in place', () => {
    const early = at(0, 2035);
    const path = early.population?.people;
    expect(path?.values[path.years.indexOf(2035)]).toBeCloseTo(0, 0);
    // Earlier is warmer at first, as the aerosols' cooling goes sooner; by 2050 it is cooler.
    expect(baselineIn(early, PEOPLE_YEAR)).toBeLessThan(baselineIn(at(0), PEOPLE_YEAR) - 0.05);
  });
});
