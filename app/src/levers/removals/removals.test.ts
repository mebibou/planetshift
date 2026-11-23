import { describe, expect, it } from 'vitest';
import { data, expectOwnGases, run } from '../../../test/levers';
import { REMOVALS } from './data';
import { countryUptake, landFor } from './model';

describe('removals', () => {
  it.each(REMOVALS)('%s alone takes up CO₂ only', (id) => expectOwnGases(id, ['co2']));
  it('take up adoption × maxShare × land × rate', () => {
    const removal = data.removals.coverCrops;
    const land = { cropland: 1000, pasture: 500 };
    expect(landFor('farmland', land)).toBe(1500);
    expect(countryUptake(removal, 0.5, 'FRA', land, 'median')).toBeCloseTo(
      0.5 * removal.maxShare * 1000 * 1.1 * 1000,
    );
    expect(countryUptake(removal, 0.5, 'FRA', land, 'p05')).toBeLessThan(
      countryUptake(removal, 0.5, 'FRA', land, 'p95'),
    );
  });
  it('report the CO₂ taken up', () => {
    const r = run({ levers: Object.fromEntries(REMOVALS.map((id) => [id, 1])) });
    expect(r.summary.removalsCo2.median).toBeGreaterThan(0);
    expect(r.summary.removalsCo2.p05).toBeLessThan(r.summary.removalsCo2.p95);
  });
});
