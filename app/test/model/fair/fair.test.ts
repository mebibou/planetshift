import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadModel, type CalibrationFile } from '../../../src/model/fair/calibration';
import { discretise, ebMatrix, expm } from '../../../src/model/fair/ebm';
import { bandAt, percentile } from '../../../src/model/fair/ensemble';
import { ch4Forcing, co2Forcing, n2oForcing } from '../../../src/model/fair/forcing';
import {
  alphaOf,
  ch4LogTerm,
  CH4_MIN,
  clampIirf,
  IIRF_MAX,
  stepBox,
} from '../../../src/model/fair/gasCycle';
import { memberOf, runMember } from '../../../src/model/fair/member';
import { annualMeans, atBounds, prepareScenario } from '../../../src/model/fair/scenario';

/**
 * Three members, a made-up scenario and Python FaIR 2.2.5's temperatures for it with the
 * internal variability off, from `fair_ts_export --fixture`.
 */
type Fixture = {
  calibration: CalibrationFile & { ebm: { eb_matrix_d: number[][][] } };
  emissions: Record<string, number | number[]>;
  landUse: number[];
  temperature: number[][];
};

const fixture: Fixture = JSON.parse(readFileSync(join(__dirname, 'fixture.json'), 'utf8'));
const STEPS = fixture.landUse.length;
const input = {
  emissions: Object.fromEntries(
    Object.entries(fixture.emissions).map(([s, v]) => [
      s,
      typeof v === 'number' ? new Array<number>(STEPS).fill(v) : v,
    ]),
  ),
  landUse: fixture.landUse,
};
const model = loadModel(fixture.calibration);
const members = model.members.map((p) => memberOf(model, p));

describe('gas cycle', () => {
  it('clamps the airborne fraction as FaIR writes it', () => {
    expect(clampIirf(150, IIRF_MAX)).toBe(IIRF_MAX);
    expect(clampIirf(42, IIRF_MAX)).toBe(42);
    expect(clampIirf(IIRF_MAX, IIRF_MAX)).toBe(0);
    expect(clampIirf(NaN, IIRF_MAX)).toBeNaN();
  });

  it('scales a lifetime by 1 where the scaling is undefined', () => {
    expect(alphaOf(99, 0, 0.1)).toBe(1);
    expect(alphaOf(NaN, 0.5, 1)).toBe(1);
    expect(alphaOf(10, 0.5, 10)).toBeCloseTo(0.5 * Math.E, 12);
  });

  it('floors a methane lifetime term at log(CH4_MIN), even where its log is undefined', () => {
    expect(ch4LogTerm(-1e9, 0, 1)).toBe(Math.log(CH4_MIN));
    expect(ch4LogTerm(10, 0, 0.01)).toBeCloseTo(Math.log(1.1), 15);
  });

  it('decays a box and fills it towards its steady state', () => {
    expect(stepBox(1, 0, 0, 1, 10, 1)).toBeCloseTo(Math.exp(-0.1), 15);
    const steady = Array.from({ length: 400 }).reduce<number>((b) => stepBox(b, 2, 1, 1, 10, 1), 0);
    expect(steady).toBeCloseTo(10, 6);
  });
});

describe('greenhouse gas forcing (Meinshausen et al. 2020)', () => {
  it('is zero at the reference concentrations', () => {
    expect(co2Forcing(277.15, 273.87, 277.15, 1)).toBe(0);
    expect(ch4Forcing(731.41, 273.87, 731.41, 1)).toBe(0);
    expect(n2oForcing(277.15, 731.41, 273.87, 273.87, 1)).toBe(0);
  });

  it('gives about 3.75 W m⁻² for doubled CO₂, before adjustments, and rises beyond saturation', () => {
    expect(co2Forcing(554.3, 273.87, 277.15, 1)).toBeCloseTo(3.75, 2);
    const max = 277.15 + 0.00075906 / (2 * 2.4785e-7);
    expect(co2Forcing(max + 100, 273.87, 277.15, 1)).toBeGreaterThan(
      co2Forcing(max, 273.87, 277.15, 1),
    );
  });
});

describe('energy balance model', () => {
  it('discretises each member as FaIR does (scipy’s expm)', () => {
    model.members.forEach((p, k) => {
      const expected = (fixture.calibration.ebm.eb_matrix_d[k] as number[][]).flat();
      Array.from(p.ebm.matrix).forEach((v, i) => expect(v).toBeCloseTo(expected[i] as number, 12));
    });
  });

  it('takes the exponential of a diagonal matrix entry by entry', () => {
    const d = expm([-1, 0, 0, 0, 0, -2, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 3]);
    [Math.exp(-1), Math.exp(-2), Math.exp(0.5), Math.exp(3)].forEach((v, i) =>
      expect(d[i * 5]).toBeCloseTo(v, 12),
    );
  });

  it('settles at forcing / feedback with no ocean uptake left', () => {
    const params = {
      heatCapacity: [8, 14, 100],
      heatTransfer: [1.2, 2, 1],
      deepOceanEfficacy: 1.2,
      gamma: 2,
    };
    const { matrix, vector } = discretise(params);
    const settled = Array.from({ length: 5000 }).reduce<number[]>(
      (x) =>
        [0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3].reduce(
            (s, c) => s + (matrix[r * 4 + c] as number) * (x[c] as number),
            (vector[r] as number) * 4,
          ),
        ),
      [0, 0, 0, 0],
    );
    expect(settled[1]).toBeCloseTo(4 / 1.2, 6);
    expect(ebMatrix(params)[0]).toBe(-2);
  });
});

describe('scenario', () => {
  it('reads calendar years at year boundaries as climate_fair does', () => {
    expect(Array.from(atBounds([1, 3, 5], 5))).toEqual([1, 2, 4, 5, 5]);
    expect(Array.from(annualMeans(Float64Array.from([0, 2, 6])))).toEqual([1, 4]);
  });
});

describe('ensemble', () => {
  it('takes percentiles as numpy does', () => {
    const sorted = [1, 2, 3, 4, 10];
    expect([5, 50, 95].map((q) => percentile(sorted, q))).toEqual(
      [1.2, 3, 8.8].map((v) => expect.closeTo(v, 12)),
    );
    expect(
      bandAt(
        [1, 4, 2].map((v) => Float64Array.of(v)),
        1750,
      ).median,
    ).toBe(2);
  });
});

describe('FaIR port against Python FaIR on the fixture', () => {
  const prepared = prepareScenario(model, input, STEPS);

  it('matches each member’s temperature at every timebound', () => {
    members.forEach((m, k) => {
      const ts = runMember(model, m, prepared).temperature;
      const python = fixture.temperature[k] as number[];
      const error = python.reduce((max, v, t) => Math.max(max, Math.abs(v - (ts[t] as number))), 0);
      expect(error).toBeLessThan(1e-8);
    });
  });

  it('carries a run on from a state to the same bits', () => {
    const m = members[1] as (typeof members)[number];
    const whole = runMember(model, m, prepared).temperature;
    const first = runMember(model, m, prepared, undefined, 275);
    const rest = runMember(model, m, prepared, first.state).temperature;
    expect(Array.from(rest.subarray(275))).toEqual(Array.from(whole.subarray(275)));
  });

  it('lends a later scenario the gases whose emissions it keeps', () => {
    const less = {
      ...input,
      emissions: { ...input.emissions, CH4: (input.emissions.CH4 as number[]).map((v) => v * 0.9) },
    };
    const lent = prepareScenario(model, less, STEPS, prepared);
    const fresh = prepareScenario(model, less, STEPS);
    expect(Array.from(lent.fixedConcentration)).toEqual(Array.from(fresh.fixedConcentration));
    expect(Array.from(lent.ch4Fixed)).toEqual(Array.from(fresh.ch4Fixed));
  });

  it('copies what comes before the first year two scenarios differ, to the same bits', () => {
    const from = 2026 - 1750;
    const later = {
      ...input,
      emissions: {
        ...input.emissions,
        CH4: (input.emissions.CH4 as number[]).map((v, t) => (t >= from ? v * 0.9 : v)),
        N2O: (input.emissions.N2O as number[]).map((v, t) => (t >= from ? v * 0.8 : v)),
      },
    };
    const copied = prepareScenario(model, later, STEPS, prepared, from);
    const fresh = prepareScenario(model, later, STEPS);
    (
      ['emissions', 'cumulative', 'fixedConcentration', 'ch4Fixed', 'minorForcing'] as const
    ).forEach((key) => expect(Array.from(copied[key]), key).toEqual(Array.from(fresh[key])));
  });
});
