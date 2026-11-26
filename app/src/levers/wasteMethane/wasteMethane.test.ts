import { describe, expect, it } from 'vitest';
import { data, expectOwnGases, lever, run, w2100 } from '../../../test/levers';
import { DEFAULT_OPTIONS } from '../../model/api';
import { runScenario } from '../../model/run';
import { BASE_SCENARIO } from '../../model/scenarios';
import { decodeState, encodeState } from '../../model/state';
import { CURRENT_YEAR } from '../../../test/model/fixtures';
import { causeOfFamily } from '../registry';
import type { WasteMethane } from './data';
import { columnsOf, sectorChange, sectorCuts, wasteMethanePath, type Factors } from './model';

const F: Factors = { capture: 0.6, diversion: 0.4, wastewaterCut: 0.45 };
const full = { captured: 1, diverted: 1, wastewater: 1 };

const years = Array.from({ length: 41 }, (_, i) => 2026 + i);
const ramp = (y: number) => Math.min(1, Math.max(0, (y - 2026) / 9));

/** One country with 1 kg of each sector, the scenario flat at that, and no food change. */
const oneCountry = (managed: number, f: Partial<Factors>): WasteMethane => ({
  year: 2022,
  total: 2,
  byCountry: { AAA: { landfill: 1, wastewater: 1, managed } },
  ch4: {
    ssp126: { years: [2020], values: [2] },
    ssp245: { years: [2020], values: [2] },
    ssp370: { years: [2020], values: [2] },
  },
  capture: { median: f.capture ?? 0, low: 0, high: 0 },
  diversion: { median: f.diversion ?? 0, low: 0, high: 0 },
  wastewaterCut: { median: f.wastewaterCut ?? 0, low: 0, high: 0 },
  decayYears: { median: 10, low: 10, high: 10 },
  source: '',
});

const pathOf = (file: WasteMethane, food = new Map()) =>
  wasteMethanePath({
    file,
    ssp: 'ssp245',
    band: 'median',
    years,
    shareAt: ramp,
    adoption: { landfills: 1, wastewater: 1 },
    columns: columnsOf(file, food),
    foodScale: () => 1,
  });

const at = (path: number[], year: number) => path[years.indexOf(year)] as number;

describe('landfill and wastewater methane', () => {
  it.each(['landfills', 'wastewater'])('%s alone cuts methane only', (id) =>
    expectOwnGases(id, ['ch4']),
  );

  it('captures gas on the managed share and diverts what is left', () => {
    expect(sectorCuts(1, F, full).landfill).toBeCloseTo(1 - 0.4 * 0.6);
    expect(sectorCuts(0, F, full).landfill).toBeCloseTo(0.4);
    expect(sectorCuts(0.5, F, { ...full, diverted: 0 }).landfill).toBeCloseTo(0.3);
    expect(sectorCuts(1, F, { ...full, wastewater: 0.5 }).wastewater).toBeCloseTo(0.225);
  });

  it('cuts what the food levers leave, never below none', () => {
    const change = sectorChange(
      { landfill: 10, wastewater: 4 },
      { landfill: -2, wastewater: -6 },
      { landfill: 0.5, wastewater: 0.5 },
    );
    expect(change.landfill).toBeCloseTo(-2 - 0.5 * 8);
    expect(change.wastewater).toBeCloseTo(-4);
  });

  it('captures at once, and diversion follows the decay of buried waste', () => {
    const capture = pathOf(oneCountry(1, { capture: 0.6 }));
    const divert = pathOf(oneCountry(1, { diversion: 0.4 }));
    expect(at(capture, 2035)).toBeCloseTo(-0.6);
    expect(at(divert, 2035)).toBeGreaterThan(-0.4 * 0.5);
    expect(at(divert, 2066)).toBeLessThan(-0.4 * 0.9);
    expect(at(divert, 2066)).toBeGreaterThan(-0.4);
  });

  it('acts on the scenario’s waste methane less the food levers’ change', () => {
    const file = oneCountry(1, { wastewaterCut: 0.5 });
    const alone = pathOf(file);
    const fed = pathOf(file, new Map([['AAA', { landfill: 0, wastewater: -0.5 }]]));
    expect(at(alone, 2040)).toBeCloseTo(-0.5);
    expect(at(fed, 2040)).toBeCloseTo(-0.25);
  });

  it('cuts less of what a diet shift and less food waste already took', () => {
    const food = { shift: 1, levers: { foodWaste: 1, supplyLosses: 1 } };
    const own = (r: ReturnType<typeof run>) => r.summary.avoided.ch4;
    const added =
      own(run({ ...food, levers: { ...food.levers, landfills: 1, wastewater: 1 } })) -
      own(run(food));
    expect(added).toBeGreaterThan(0);
    expect(added).toBeLessThan(own(run({ levers: { landfills: 1, wastewater: 1 } })));
  });

  it('counts its warming in the waste cause, under its own family', () => {
    const r = lever('landfills');
    const byCause = r.summary.byFamilyCause.avoidedWarming2100.wasteMethane;
    expect(causeOfFamily('wasteMethane')).toBe('waste');
    expect(byCause?.waste).toBeCloseTo(w2100(r), 12);
    expect(byCause?.agriculture).toBe(0);
  });

  it('gives each country its waste methane and its change on the map', () => {
    const r = run({ levers: { landfills: 1, wastewater: 1 } });
    const fra = r.countries.find((c) => c.iso3 === 'FRA')?.wasteMethane;
    expect(fra?.before).toEqual({ landfill: 0.9e9, wastewater: 0.25e9 });
    expect(fra?.change.wastewater).toBeCloseTo(-0.45 * 0.25e9, -3);
    expect(fra?.change.landfill).toBeCloseTo(-(1 - 0.4 * 0.6) * 0.9e9, -3);
  });

  it('does nothing without wastemethane.json', () => {
    const d = { ...structuredClone(data), wastemethane: {} as WasteMethane };
    const r = runScenario(
      d,
      { ...BASE_SCENARIO, levers: { landfills: 1, wastewater: 1 } },
      DEFAULT_OPTIONS,
      CURRENT_YEAR,
    );
    expect(r.summary.avoided.ch4).toBe(0);
  });

  it('round-trip in the URL', () => {
    const scenario = { ...BASE_SCENARIO, levers: { landfills: 0.5, wastewater: 1 } };
    expect(encodeState(scenario, DEFAULT_OPTIONS)).toBe('lf=50&ww=100');
    expect(decodeState('lf=50&ww=100').scenario).toEqual(scenario);
  });
});
