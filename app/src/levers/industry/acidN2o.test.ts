import { describe, expect, it } from 'vitest';
import { data, lever, run, w2050, w2100 } from '../../../test/levers';
import { leverAvailable } from '../registry';
import { BASE_SCENARIO } from '../../model/scenarios';
import { dataValueAt } from '../../model/util';
import { ACID_N2O_LEVER, acidN2oCut, acidN2oPath, hasAcidN2o, withAcidN2o } from './acidN2o';

const acid = data.acidn2o;
const COMPLETE = BASE_SCENARIO.rampEnd;
const emitted = (a: 'adipic' | 'nitric', year: number) =>
  dataValueAt(acid.years, acid.emissions.ssp245[a], year);

describe('the nitric and adipic acid N₂O lever', () => {
  it('avoids N₂O alone, counted in the buildings and industry family', () => {
    const r = lever(ACID_N2O_LEVER);
    expect(w2050(r)).toBeGreaterThan(0);
    expect(w2100(r)).toBeGreaterThan(w2050(r));
    expect(r.summary.avoided.co2).toBe(0);
    expect(r.summary.avoided.ch4).toBe(0);
    expect(r.summary.byFamily.avoidedWarming2100.industry).toBeCloseTo(w2100(r), 12);
  });

  it('removes the abated share of each acid’s N₂O once the ramp is complete', () => {
    const expected =
      acid.abated.adipic * emitted('adipic', COMPLETE) +
      acid.abated.nitric * emitted('nitric', COMPLETE);
    expect(acidN2oCut(acid, 'ssp245', COMPLETE, 1)).toBeCloseTo(expected, 0);
    expect(lever(ACID_N2O_LEVER).summary.avoided.n2o).toBeCloseTo(expected, -3);
    expect(lever(ACID_N2O_LEVER, 0.5).summary.avoided.n2o).toBeCloseTo(expected / 2, -3);
  });

  it('adds to the clean industry lever without changing it', () => {
    const ci = lever('cleanIndustry').summary;
    const both = run({ levers: { cleanIndustry: 1, [ACID_N2O_LEVER]: 1 } }).summary;
    expect(both.avoided.co2).toBeCloseTo(ci.avoided.co2, -3);
    expect(both.avoided.n2o).toBeGreaterThan(ci.avoided.n2o);
  });

  it('changes nothing without its file or at 0', () => {
    const years = [2030, 2050];
    const none = { co2: 0, ch4: 0, n2o: 0, hfc: 0 };
    expect(acidN2oPath(undefined, 1, 'ssp245', years, () => 1)).toEqual([none, none]);
    expect(acidN2oPath(acid, 0, 'ssp245', years, () => 1)).toEqual([none, none]);
    expect(hasAcidN2o({})).toBe(false);
    expect(leverAvailable({ ...data, acidn2o: {} as typeof acid }, ACID_N2O_LEVER)).toBe(false);
    expect(leverAvailable(data, ACID_N2O_LEVER)).toBe(true);
  });

  it('adds its N₂O to the other gases year by year', () => {
    const gases = [{ co2: 1, ch4: 2, n2o: 3, hfc: 0 }];
    const path = acidN2oPath(acid, 1, 'ssp245', [2050], () => 1);
    expect(withAcidN2o(gases, path)[0]).toEqual({ ...gases[0], n2o: 3 + (path[0]?.n2o ?? 0) });
  });
});
