import { describe, expect, it } from 'vitest';
import { data, lever, run, w2050, w2100 } from '../../../test/levers';
import { CURRENT_YEAR } from '../../../test/model/fixtures';
import { departuresOf } from '../../config';
import { DEFAULT_OPTIONS } from '../../model/api';
import { runScenario } from '../../model/run';
import { BASE_SCENARIO } from '../../model/scenarios';
import { dataValueAt } from '../../model/util';
import { CO2_PER_CH4 } from '../energy/coemissions';
import { FOSSIL_METHANE_LEVERS } from './data';
import { countryLeaks, leakCut, leaksLeft, leaksOf, NO_LEAKS, scenarioLeakChange } from './model';

const fm = data.fossilmethane;
const COMPLETE = BASE_SCENARIO.rampEnd;
const leaked = (group: 'oilGas' | 'coal', year: number) =>
  dataValueAt(fm.years, fm.emissions.ssp245[group], year);

describe('methane leak levers', () => {
  it.each(FOSSIL_METHANE_LEVERS)('%s alone avoids methane, attributed to its family', (id) => {
    const r = lever(id);
    expect(w2050(r)).toBeGreaterThan(0);
    expect(w2100(r)).toBeGreaterThan(0);
    expect(r.summary.byFamily.avoidedWarming2100.fossilMethane).toBeCloseTo(w2100(r), 12);
    expect(r.summary.byFamily.avoidedWarming2100.energy).toBe(0);
    expect(r.summary.avoided.n2o).toBe(0);
  });

  it('cuts the avoidable share of the scenario’s leaks once the ramp is complete', () => {
    const og = lever('oilGasMethane').summary.avoided;
    const coal = lever('coalMineMethane').summary.avoided;
    expect(og.ch4).toBeCloseTo(0.75 * leaked('oilGas', COMPLETE), -6);
    expect(coal.ch4).toBeCloseTo(0.5 * leaked('coal', COMPLETE), -6);
    expect(og.co2).toBeCloseTo(og.ch4 * CO2_PER_CH4, -6);
  });

  it('counts no CO₂ from the methane without the fossilMethaneCo2 departure', () => {
    const r = runScenario(
      { ...data, departures: { ...departuresOf(data), fossilMethaneCo2: 'off' } },
      { ...BASE_SCENARIO, levers: { oilGasMethane: 1 } },
      DEFAULT_OPTIONS,
      CURRENT_YEAR,
    );
    expect(r.summary.avoided.co2).toBe(0);
    expect(r.summary.avoided.ch4).toBeGreaterThan(0);
  });

  it('leaves less methane for the fuel levers to avoid, and shares the overlap out', () => {
    const levers = { electricCars: 1, cleanIndustry: 1 };
    const fuel = run({ levers }).summary;
    const leaks = lever('oilGasMethane').summary;
    const both = run({ levers: { ...levers, oilGasMethane: 1 } }).summary;
    expect(both.avoided.ch4).toBeLessThan(fuel.avoided.ch4 + leaks.avoided.ch4);
    expect(both.avoided.ch4).toBeGreaterThan(fuel.avoided.ch4);
    const shares = Object.values(both.byFamily.avoidedWarming2100).reduce((a, b) => a + b, 0);
    expect(shares).toBeCloseTo(both.avoidedWarming2100.median, 12);
    expect(both.byFamily.avoidedWarming2100.fossilMethane).toBeLessThan(
      leaks.avoidedWarming2100.median,
    );
  });
});

describe('the leak model', () => {
  const full = (id: string) => (FOSSIL_METHANE_LEVERS.includes(id as never) ? 1 : 0);

  it('cuts each group by its lever and avoidable share, ramped', () => {
    expect(leakCut(fm, full, 0.5)).toEqual({ oilGas: 0.375, coal: 0.25 });
    expect(leakCut(fm, (id) => (id === 'coalMineMethane' ? 1 : 0), 1)).toEqual({
      oilGas: 0,
      coal: 0.5,
    });
  });

  it('takes back the methane leaked supplying the fuel a sector no longer burns', () => {
    const cut = leakCut(fm, full, 1);
    const perKg = fm.perKgCo2.ssp245.electricity as { oilGas: number[]; coal: number[] };
    const co2 = { electricity: -1e9 };
    expect(leaksLeft(fm, 'ssp245', 2023, co2, cut)).toBeCloseTo(
      1e9 * (0.75 * (perKg.oilGas[0] as number) + 0.5 * (perKg.coal[0] as number)),
      3,
    );
    expect(
      leaksOf(
        fm,
        () => 0,
        'ssp245',
        () => 1,
      ),
    ).toBe(NO_LEAKS);
    expect(scenarioLeakChange(fm, 'ssp245', 2023, cut)).toBeCloseTo(
      -(0.75 * 84.8e9 + 0.5 * 46.1e9),
      -3,
    );
  });

  it('gives a country’s leaks and their change at full adoption, none without its data', () => {
    expect(countryLeaks(fm, 'USA', full)).toEqual({
      fossilMethane: { oilGas: 13e9, coal: 0.9e9 },
      fossilMethaneChange: -(0.75 * 13e9 + 0.5 * 0.9e9),
    });
    expect(countryLeaks(fm, 'FRA', full)).toBeNull();
    const usa = lever('oilGasMethane').countries.find((c) => c.iso3 === 'USA');
    expect(usa?.fossilMethaneChange).toBeCloseTo(-0.75 * 13e9, -3);
  });
});
