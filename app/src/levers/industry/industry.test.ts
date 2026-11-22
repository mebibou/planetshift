import { describe, expect, it } from 'vitest';
import { data, lever, run, w2050, w2100 } from '../../../test/levers';
import { DEFAULT_OPTIONS } from '../../model/api';
import { runScenario } from '../../model/run';
import { BASE_SCENARIO } from '../../model/scenarios';
import { decodeState, encodeState } from '../../model/state';
import { CURRENT_YEAR } from '../../../test/model/fixtures';
import type { IndustrySector } from './data';
import { heatingSaving, INDUSTRY_LEVERS, industryCo2Change, industrySaving } from './model';

const at2035 = (sector: IndustrySector) => {
  const s = data.industry.co2.ssp245[sector];
  return s.values[s.years.indexOf(2035)] as number;
};
const grid2035 = () => {
  const g = data.sectors.gridIntensity.ssp245;
  return g.values[g.years.indexOf(2035)] as number;
};

/** The fixtures with one sector's CO₂ doubled in every SSP and year. */
const doubled = (sector: IndustrySector) => {
  const d = structuredClone(data);
  Object.values(d.industry.co2).forEach((bySector) => {
    const s = bySector[sector];
    s.values = s.values.map((v) => 2 * v);
  });
  return d;
};
const avoidedOn = (d: typeof data, id: string) =>
  runScenario(d, { ...BASE_SCENARIO, levers: { [id]: 1 } }, DEFAULT_OPTIONS, CURRENT_YEAR).summary
    .avoided.co2;

describe('industry levers', () => {
  it.each(INDUSTRY_LEVERS)('%s alone avoids CO₂ and methane, attributed to its family', (id) => {
    const r = lever(id);
    expect(w2100(r)).toBeGreaterThan(0);
    expect(r.summary.byFamily.avoidedWarming2100.industry).toBeCloseTo(w2100(r), 12);
    expect(r.summary.byFamily.avoidedWarming2100.energy).toBe(0);
    expect(r.summary.avoided.ch4).toBeGreaterThan(0);
    expect(r.summary.avoided.n2o).toBe(0);
  });

  it('clean heating acts on buildings and clean industry on industry', () => {
    const heating = avoidedOn(data, 'cleanHeating');
    const industry = avoidedOn(data, 'cleanIndustry');
    expect(avoidedOn(doubled('buildings'), 'cleanHeating')).toBeCloseTo(2 * heating, -3);
    expect(avoidedOn(doubled('buildings'), 'cleanIndustry')).toBeCloseTo(industry, -3);
    expect(avoidedOn(doubled('industry'), 'cleanIndustry')).toBeCloseTo(2 * industry, -3);
    expect(avoidedOn(doubled('industry'), 'cleanHeating')).toBeCloseTo(heating, -3);
  });

  it('heat pumps save the boilers’ CO₂ less the electricity they draw', () => {
    const r = lever('cleanHeating');
    const boilers = at2035('buildings');
    expect(r.summary.avoided.co2).toBeLessThan(boilers);
    expect(r.summary.avoided.co2).toBeCloseTo(boilers * (1 - 1.49 * grid2035()), -6);
  });

  it('clean industry cuts steel’s and cement’s share of industry, less their electricity', () => {
    const r = lever('cleanIndustry');
    const g = grid2035();
    const expected =
      at2035('industry') * (0.289 * 0.9 * (1 - 1.5 * g) + 0.287 * 0.8 * (1 - 0.25 * g));
    expect(r.summary.avoided.co2).toBeCloseTo(expected, -6);
    expect(r.summary.avoided.co2).toBeLessThan(0.576 * at2035('industry'));
  });

  it('save more with renewable electricity, and all of their cut on a clean grid', () => {
    const re = w2100(lever('renewableElectricity'));
    INDUSTRY_LEVERS.forEach((id) =>
      expect(w2100(run({ levers: { [id]: 1, renewableElectricity: 1 } })), id).toBeGreaterThan(
        w2100(lever(id)) + re,
      ),
    );
    expect(heatingSaving(data.industry, 'median', 0)).toBe(1);
    expect(heatingSaving(data.industry, 'median', 0.3)).toBeLessThan(1);
    expect(industrySaving(data.industry, 'median', 0)).toBeCloseTo(0.289 * 0.9 + 0.287 * 0.8, 12);
    const ctx = { industry: data.industry, sectors: data.sectors, ssp: 'ssp245' as const };
    const change = (renewableElectricity: number) =>
      industryCo2Change({ ...ctx, band: 'median' }, 2040, {
        cleanHeating: 1,
        cleanIndustry: 1,
        renewableElectricity,
      });
    expect(change(1)).toBeLessThan(change(0.5));
    expect(change(0.5)).toBeLessThan(change(0));
  });

  it('avoid more with more adoption', () => {
    INDUSTRY_LEVERS.forEach((id) => {
      const w = [0, 0.25, 0.5, 1].map((a) => w2050(lever(id, a)));
      w.slice(1).forEach((v, k) => expect(v, id).toBeGreaterThan(w[k] as number));
    });
  });

  it('give a range in the right direction', () =>
    INDUSTRY_LEVERS.forEach((id) => {
      const w = lever(id).summary.avoidedWarming2100;
      expect(w.p05, id).toBeLessThan(w.median);
      expect(w.p95, id).toBeGreaterThan(w.median);
    }));

  it('leave the farm emissions and the farming warming line alone', () => {
    const r = run({ levers: { cleanHeating: 1, cleanIndustry: 1 } });
    const none = run();
    expect(r.scenarioEmissions).toEqual(none.scenarioEmissions);
    expect(r.temperature.agricultureScenario).toEqual(none.temperature.agricultureScenario);
    expect(r.temperature.baseline).toEqual(none.temperature.baseline);
  });

  it('do nothing without industry.json', () => {
    const d = { ...structuredClone(data), industry: {} as typeof data.industry };
    expect(avoidedOn(d, 'cleanHeating')).toBe(0);
  });

  it('round-trip in the URL', () => {
    const scenario = { ...BASE_SCENARIO, levers: { cleanHeating: 0.5, cleanIndustry: 1 } };
    expect(encodeState(scenario, DEFAULT_OPTIONS)).toBe('ch=50&ci=100');
    expect(decodeState('ch=50&ci=100').scenario).toEqual(scenario);
  });
});
