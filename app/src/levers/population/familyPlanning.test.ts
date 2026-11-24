import { describe, expect, it } from 'vitest';
import { CURRENT_YEAR, data, lever, run, w2050, w2100 } from '../../../test/levers';
import { loadRealData } from '../../../test/model/realData';
import { DEFAULT_OPTIONS, type ScenarioResult } from '../../model/api';
import { runScenario } from '../../model/run';
import { BASE_SCENARIO } from '../../model/scenarios';
import { sum } from '../../model/util';
import { FAMILIES, LEVER_IDS } from '../registry';
import { populationSpec } from './spec';
import { fertilityLag, fewerChildren, LOW_COMPLETE_YEAR, worldRatio } from './model';

const ID = 'familyPlanning';
const pop = data.population;
const baselineIn = (r: ScenarioResult, year: number) =>
  r.temperature.baseline.median[year - (r.temperature.years[0] as number)] as number;

describe('half a child per woman fewer', () => {
  it('is the low variant over the medium one, moved later to end with every lever', () => {
    expect(fertilityLag(pop, LOW_COMPLETE_YEAR, pop.lastEstimate + 1)).toBe(0);
    expect(fertilityLag(pop, 2050, CURRENT_YEAR)).toBe(2050 - LOW_COMPLETE_YEAR);
    expect(fertilityLag(pop, 2027, CURRENT_YEAR)).toBe(CURRENT_YEAR - pop.lastEstimate - 1);
    const full = fewerChildren(pop, 1, 0);
    expect(full(pop.lastEstimate)).toBe(1);
    expect(full(2100)).toBeCloseTo(worldRatio(pop, 'low', 2100), 9);
    expect(fewerChildren(pop, 1, 16)(2100)).toBeCloseTo(worldRatio(pop, 'low', 2084), 9);
    expect(fewerChildren(pop, 0.5, 0)(2100) - 1).toBeCloseTo((full(2100) - 1) / 2, 9);
  });
});

describe('the education and family planning lever', () => {
  it('stays out of the panel and the breakdown without ?popctl=lever', () => {
    expect(LEVER_IDS).not.toContain(ID);
    expect(FAMILIES).not.toContain('population');
    expect(Object.keys(run().summary.byFamily.avoidedWarming2100)).not.toContain('population');
  });

  it('changes nothing at 0 and avoids more warming with more adoption, most of it after 2050', () => {
    expect(lever(ID, 0, { shift: 0.3 }).summary).toEqual(run({ shift: 0.3 }).summary);
    const steps = [0.25, 0.5, 0.75, 1].map((a) => w2100(lever(ID, a)));
    steps.slice(1).forEach((v, k) => expect(v).toBeGreaterThan(steps[k] as number));
    expect(w2050(lever(ID))).toBeLessThan(w2100(lever(ID)) / 3);
  });

  it('leaves the baseline alone and acts on farm emissions only', () => {
    const r = lever(ID);
    expect(r.temperature.baseline).toEqual(run().temperature.baseline);
    expect(r.summary.byCause.avoidedWarming2100.fossilIndustry).toBe(0);
    expect(r.summary.byCause.avoidedWarming2100.agriculture).toBeGreaterThan(0);
  });

  it('is a player of its own: with the diet, the shares add up and together avoid less than apart', () => {
    const both = run({ shift: 0.5, levers: { [ID]: 1 } });
    const s = both.summary;
    expect(sum(Object.values(s.byFamily.avoidedWarming2100))).toBeCloseTo(
      s.avoidedWarming2100.median,
      9,
    );
    expect(s.byFamily.avoidedWarming2100.population).toBeGreaterThan(0);
    expect(w2100(both)).toBeLessThan(w2100(lever(ID)) + w2100(run({ shift: 0.5 })));
  });

  it('does nothing with the low projection, and says why', () => {
    expect(w2100(lever(ID, 1, {}, { population: 'low' }))).toBe(0);
    expect(populationSpec.ui.blocked?.({ ...DEFAULT_OPTIONS, population: 'low' })).toBe(
      'levers.population.familyPlanning.unavailable',
    );
    expect(populationSpec.ui.blocked?.(DEFAULT_OPTIONS)).toBeNull();
  });

  it('brings the high projection near the medium one, and acts on the SSP2 farm path too', () => {
    const high = lever(ID, 1, {}, { population: 'high' });
    const medium = run({}, { population: 'medium' });
    const shown = (r: ScenarioResult) =>
      baselineIn(r, 2100) - (r.summary.avoidedWarming2100.median as number);
    expect(Math.abs(shown(high) - shown(medium))).toBeLessThan(
      baselineIn(run({}, { population: 'high' }), 2100) - baselineIn(medium, 2100),
    );
    expect(w2100(lever(ID, 1, {}, { baseline: 'ssp2' }))).toBeGreaterThan(0);
  });
});

const real = loadRealData();

describe.skipIf(real === null)('the lever on the real data', () => {
  const realData = real as NonNullable<typeof real>;
  it('at 100% with the ramp of the low variant, avoids about the low projection’s gap in 2100', () => {
    const at = (levers: Record<string, number>, population: 'medium' | 'low') =>
      runScenario(
        realData,
        { ...BASE_SCENARIO, rampEnd: LOW_COMPLETE_YEAR + (CURRENT_YEAR - 2024), levers },
        { ...DEFAULT_OPTIONS, population },
        CURRENT_YEAR,
      );
    const full = at({ [ID]: 1 }, 'medium');
    const gap = baselineIn(at({}, 'medium'), 2100) - baselineIn(at({}, 'low'), 2100);
    expect(w2100(full)).toBeGreaterThan(gap * 0.8);
    expect(w2100(full)).toBeLessThan(gap * 1.2);
  });
});
