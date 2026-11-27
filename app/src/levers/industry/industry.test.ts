import { describe, expect, it } from 'vitest';
import { data, lever, run, supply, w2050, w2100 } from '../../../test/levers';
import { departuresOf } from '../../config';
import { DEFAULT_OPTIONS } from '../../model/api';
import { runScenario } from '../../model/run';
import { BASE_SCENARIO } from '../../model/scenarios';
import { decodeState, encodeState } from '../../model/state';
import { CURRENT_YEAR } from '../../../test/model/fixtures';
import type { IndustrySector } from './data';
import { sectorCo2 } from '../energy/model';
import { EFFICIENCY, INDUSTRY_LEVERS, industryCo2, industryCo2BySource, restParts } from './model';

const at2035 = (sector: IndustrySector) => {
  const s = data.industry.co2.ssp245[sector];
  return s.values[s.years.indexOf(2035)] as number;
};
const electricity2035 = () => sectorCo2(data.sectors, 'ssp245', 'electricity', 2035);
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

/** A lever alone without the fossilMethaneCo2 departure, to check the CO₂ accounting by itself. */
const withoutMethaneCo2 = (id: string) =>
  runScenario(
    { ...data, departures: { ...departuresOf(data), fossilMethaneCo2: 'off' } },
    { ...BASE_SCENARIO, levers: { [id]: 1 } },
    DEFAULT_OPTIONS,
    CURRENT_YEAR,
  );

/** Levers whose grid power, on the fixtures' grid, leaks more methane than the fuel they save. */
const GRID_METHANE_WINS: readonly string[] = ['otherIndustry'];

describe('industry levers', () => {
  it.each(INDUSTRY_LEVERS)('%s alone avoids CO₂, attributed to its family', (id) => {
    const r = lever(id);
    expect(w2100(r)).toBeGreaterThan(0);
    expect(r.summary.byFamily.avoidedWarming2100.industry).toBeCloseTo(w2100(r), 12);
    expect(r.summary.byFamily.avoidedWarming2100.energy).toBe(0);
    expect(r.summary.avoided.ch4 > 0, id).toBe(!GRID_METHANE_WINS.includes(id));
    expect(r.summary.avoided.n2o).not.toBe(0);
  });

  it('clean heating acts on buildings and clean industry on industry', () => {
    const heating = avoidedOn(data, 'cleanHeating');
    const industry = avoidedOn(data, 'cleanIndustry');
    expect(avoidedOn(doubled('buildings'), 'cleanHeating')).toBeCloseTo(2 * heating, -3);
    expect(avoidedOn(doubled('buildings'), 'cleanIndustry')).toBeCloseTo(industry, -3);
    expect(avoidedOn(doubled('industry'), 'cleanIndustry')).toBeCloseTo(2 * industry, -3);
    expect(avoidedOn(doubled('industry'), 'cleanHeating')).toBeCloseTo(heating, -3);
    const other = avoidedOn(data, 'otherIndustry');
    expect(avoidedOn(doubled('industry'), 'otherIndustry')).toBeCloseTo(2 * other, -3);
    expect(avoidedOn(doubled('buildings'), 'otherIndustry')).toBeCloseTo(other, -3);
  });

  it('heat pumps save the boilers’ CO₂ less the electricity they draw', () => {
    const r = withoutMethaneCo2('cleanHeating');
    const boilers = at2035('buildings');
    expect(r.summary.avoided.co2).toBeLessThan(boilers * (1 + supply('buildings')));
    expect(r.summary.avoided.co2).toBeCloseTo(
      boilers * (1 + supply('buildings') - 1.49 * grid2035() * (1 + supply('electricity'))),
      -6,
    );
  });

  it('clean industry cuts steel’s, cement’s and chemicals’ share of industry, less their electricity', () => {
    const r = withoutMethaneCo2('cleanIndustry');
    const g = grid2035();
    const expected =
      at2035('industry') *
      (0.289 * 0.9 * (1 + supply('industry') - 1.5 * g * (1 + supply('electricity'))) +
        0.287 * 0.8 * (1 + supply('industry') - 0.25 * g * (1 + supply('electricity'))) +
        0.057 * 0.8 * (1 + supply('industry') - 1.9 * g * (1 + supply('electricity'))));
    expect(r.summary.avoided.co2).toBeCloseTo(expected, -6);
    expect(r.summary.avoided.co2).toBeLessThan(
      0.633 * at2035('industry') * (1 + supply('industry')),
    );
  });

  it('other industry puts its low-temperature heat on heat pumps and cleans the rest of it', () => {
    const r = withoutMethaneCo2('otherIndustry');
    const g = grid2035();
    const saved = (cut: number, kwh: number) =>
      cut * (1 + supply('industry') - kwh * g * (1 + supply('electricity')));
    expect(r.summary.avoided.co2).toBeCloseTo(
      at2035('industry') * 0.32 * (0.3 * saved(1, 1.49) + 0.7 * saved(0.9, 2.61)),
      -6,
    );
    expect(restParts(data.industry).map((p) => p.share)).toEqual([0.32 * 0.3, 0.32 * 0.7]);
  });

  it('leave ammonia out of the rest of industry', () => {
    const p = data.industry.industryParts;
    const rest = data.industry.industryRest.share;
    expect(p.steel.share + p.cement.share + p.chemicals.share + rest).toBeLessThan(0.97);
  });

  it('save more with renewable electricity, and all of their cut on a clean grid', () => {
    const re = w2100(lever('renewableElectricity'));
    (['cleanHeating', 'cleanIndustry', 'otherIndustry'] as const).forEach((id) =>
      expect(w2100(run({ levers: { [id]: 1, renewableElectricity: 1 } })), id).toBeGreaterThan(
        w2100(lever(id)) + re,
      ),
    );
    const ctx = { industry: data.industry, sectors: data.sectors, ssp: 'ssp245' as const };
    const bySource = (renewableElectricity: number) =>
      industryCo2BySource({ ...ctx, band: 'median' }, 2040, {
        efficientBuildings: 0,
        cleanHeating: 1,
        cleanIndustry: 1,
        otherIndustry: 1,
        renewableElectricity,
      });
    const clean = bySource(1);
    expect(clean.electricity).toBe(0);
    expect(clean.industry).toBeCloseTo(
      -(0.289 * 0.9 + 0.287 * 0.8 + 0.057 * 0.8 + 0.32 * 0.3 + 0.32 * 0.7 * 0.9) *
        industryCo2(data.industry, 'ssp245', 'industry', 2040),
      0,
    );
    expect(clean.buildings).toBe(-industryCo2(data.industry, 'ssp245', 'buildings', 2040));
    const half = bySource(0.5);
    const none = bySource(0);
    expect(half.electricity).toBeCloseTo(none.electricity / 2, 0);
    expect(none.electricity).toBeGreaterThan(0);
    expect(half.buildings).toBe(none.buildings);
  });

  it('efficient buildings cut their fuel and their share of the grid’s CO₂', () => {
    const r = withoutMethaneCo2('efficientBuildings');
    expect(r.summary.avoided.co2).toBeCloseTo(
      0.42 *
        (at2035('buildings') * (1 + supply('buildings')) +
          0.5 * electricity2035() * (1 + supply('electricity'))),
      -6,
    );
  });

  it('efficient buildings leave less for heat pumps and a clean grid to clean', () => {
    const ctx = { industry: data.industry, sectors: data.sectors, ssp: 'ssp245' as const };
    const bySource = (efficientBuildings: number, cleanHeating: number, re: number) =>
      industryCo2BySource({ ...ctx, band: 'median' }, 2040, {
        efficientBuildings,
        cleanHeating,
        cleanIndustry: 0,
        otherIndustry: 0,
        renewableElectricity: re,
      });
    const buildings = industryCo2(data.industry, 'ssp245', 'buildings', 2040);
    const saved = EFFICIENCY.potential;
    expect(bySource(1, 0, 0).buildings).toBeCloseTo(-saved * buildings, 0);
    expect(bySource(1, 1, 0).buildings).toBeCloseTo(-buildings, 0);
    expect(bySource(1, 1, 0).electricity - bySource(1, 0, 0).electricity).toBeCloseTo(
      (1 - saved) * (bySource(0, 1, 0).electricity - bySource(0, 0, 0).electricity),
      0,
    );
    expect(bySource(1, 0, 0).electricity).toBeCloseTo(
      -saved * EFFICIENCY.electricityShare * sectorCo2(data.sectors, 'ssp245', 'electricity', 2040),
      0,
    );
    expect(bySource(1, 0, 0.5).electricity).toBeCloseTo(bySource(1, 0, 0).electricity / 2, 0);
    expect(bySource(1, 1, 1).electricity).toBe(0);
    const w = (levers: Record<string, number>) => w2100(run({ levers }));
    const both = { efficientBuildings: 1, cleanHeating: 1 };
    expect(w(both)).toBeLessThan(w({ efficientBuildings: 1 }) + w({ cleanHeating: 1 }));
    expect(w({ ...both, renewableElectricity: 1 })).toBeLessThan(
      w(both) + w({ renewableElectricity: 1 }),
    );
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
    expect(r.temperature.baseline).toEqual(none.temperature.baseline);
  });

  it('do nothing without industry.json', () => {
    const d = { ...structuredClone(data), industry: {} as typeof data.industry };
    expect(avoidedOn(d, 'cleanHeating')).toBe(0);
  });

  it('round-trip in the URL', () => {
    const levers = { efficientBuildings: 0.25, cleanHeating: 0.5, cleanIndustry: 1 };
    const scenario = { ...BASE_SCENARIO, levers };
    expect(encodeState(scenario, DEFAULT_OPTIONS)).toBe('eb=25&ch=50&ci=100');
    expect(decodeState('eb=25&ch=50&ci=100').scenario).toEqual(scenario);
  });
});
