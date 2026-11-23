import { describe, expect, it } from 'vitest';
import type { Gas, Item } from '../../data/types';
import {
  data,
  expectOwnGases,
  jointShare,
  lever,
  rampShare,
  run,
  w2050,
} from '../../../test/levers';
import { groupIndicesOf } from '../../model/prepare';
import { gasSplitOf, intensityCuts, type PracticeCut, type SourceShares } from './model';
import type { Practice, PracticeId } from './data';

const GASES_CUT: Record<PracticeId, Gas[]> = {
  feedAdditives: ['ch4'],
  breedingAndFeed: ['ch4'],
  manureManagement: ['ch4', 'n2o'],
  riceWater: ['ch4'],
  nitrogenEfficiency: ['n2o'],
  nitrificationInhibitors: ['n2o'],
  farmEnergy: ['co2'],
};

describe('practices', () => {
  it.each(Object.entries(GASES_CUT))('%s alone cuts its own gases only', (id, gases) =>
    expectOwnGases(id, gases),
  );
  const enteric = (cut: number, groups?: Practice['groups']): PracticeCut => ({
    practice: {
      sources: ['enteric'],
      gases: ['ch4'],
      ...(groups ? { groups } : {}),
      reduction: { median: 1, low: 1, high: 1 },
      applicable: { World: 1 },
      source: '',
    },
    cut,
  });
  it('combine multiplicatively on the same source', () => {
    const items = groupIndicesOf([{ group: 'dairy' }, { group: 'pigMeat' }] as Item[]);
    const split: SourceShares[] = [
      {
        gas: 'ch4',
        source: 'enteric',
        shares: Float64Array.from([0.5, 1]),
        items: Int32Array.from([0, 1]),
      },
      {
        gas: 'n2o',
        source: 'manure',
        shares: Float64Array.from([1, 1]),
        items: Int32Array.from([0, 1]),
      },
    ];
    const cut = intensityCuts(split, [enteric(0.3), enteric(0.2, ['dairy'])], items);
    expect(cut.ch4[0]).toBeCloseTo(0.5 * 0.44);
    expect(cut.ch4[1]).toBeCloseTo(0.3);
    expect(Array.from(cut.n2o)).toEqual([0, 0]);
    const both = run({ levers: { feedAdditives: 1, breedingAndFeed: 1 } }).summary.avoided.ch4;
    const apart =
      lever('feedAdditives').summary.avoided.ch4 + lever('breedingAndFeed').summary.avoided.ch4;
    expect(both).toBeGreaterThan(lever('feedAdditives').summary.avoided.ch4);
    expect(both).toBeLessThan(apart);
  });
  it('read the country split first, then the world, then the other scope', () => {
    expect(gasSplitOf(data.breakdown, 'FRA', '2731', 'farmGate', 'ch4')).toEqual({
      enteric: 0.8,
      manure: 0.2,
    });
    expect(gasSplitOf(data.breakdown, 'USA', '2731', 'farmGate', 'ch4')).toEqual({
      enteric: 0.85,
      manure: 0.15,
    });
    expect(gasSplitOf(data.breakdown, 'FRA', '2731', 'cradleToFarmGate', 'ch4')).toEqual({
      enteric: 0.85,
      manure: 0.15,
    });
    expect(gasSplitOf(data.breakdown, 'FRA', '9999', 'farmGate', 'ch4')).toBeUndefined();
  });
  it('act on the shifted production too', () => {
    const shift = run({ shift: 0.5 });
    const both = lever('feedAdditives', 1, { shift: 0.5 });
    const alone = lever('feedAdditives');
    expect(w2050(both)).toBeGreaterThan(w2050(shift));
    expect(w2050(both) - w2050(shift)).toBeLessThan(w2050(alone));
  });
  it('ramp in on the shifted production as both ramp in', () => {
    const joint = jointShare('feedAdditives', 'ch4', true);
    const r = rampShare(2030);
    expect(joint(2035)).not.toBe(0);
    expect(joint(2030) / joint(2035)).toBeCloseTo(r * r, 9);
  });
  it('show in each country’s change in emissions', () => {
    const r = lever('feedAdditives');
    r.countries.forEach((c) => expect(c.emissionsChange.ch4).toBeLessThan(0));
  });
});
