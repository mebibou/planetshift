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
import { decodeState } from '../../model/state';
import {
  gasSplitOf,
  intensityCuts,
  gridPath,
  netReduction,
  type PracticeCut,
  type SourceShares,
} from './model';
import type { Practice, PracticeId } from './data';

const GASES_CUT: Record<PracticeId, Gas[]> = {
  feedAdditives: ['ch4'],
  breedingAndFeed: ['ch4'],
  manureManagement: ['ch4', 'n2o'],
  riceWater: ['ch4'],
  nitrogenEfficiency: ['n2o'],
  farmEnergy: ['co2'],
};

describe('practices', () => {
  it.each(Object.entries(GASES_CUT))('%s alone cuts its own gases only', (id, gases) =>
    expectOwnGases(id, gases),
  );
  it('farmEnergy acts in the cradle-to-farm-gate scope only, where the fuel is counted', () => {
    expect(lever('farmEnergy', 1, {}, { scope: 'farmGate' }).summary.avoided.co2).toBe(0);
    expect(lever('farmEnergy').summary.avoided.co2).toBeGreaterThan(0);
  });
  it('farmEnergy charges the fuel it switches to electricity at the country’s share of the world grid', () => {
    const fuel: Practice = {
      sources: ['fuel'],
      gases: ['co2'],
      reduction: { median: 0.5, low: 0.25, high: 0.8 },
      applicable: { World: 1 },
      electrified: {
        efficiency: 0.25,
        kwhPerFuelCo2: { World: 1.5, FRA: 1.6 },
        gridRatio: { World: 1, FRA: 0.1, IND: 1.5 },
        kgCo2PerKwh: 0.5,
      },
      source: '',
    };
    expect(netReduction(fuel, 'FRA', 'median', 0.4)).toBeCloseTo(0.5 - 0.25 * 1.6 * 0.1 * 0.4);
    expect(netReduction(fuel, 'BRA', 'median', 0.4)).toBeCloseTo(0.5 - 0.25 * 1.5 * 0.4);
    expect(netReduction(fuel, 'IND', 'p95', 0.4)).toBeCloseTo(0.8 - 0.55 * 1.5 * 1.5 * 0.4);
    expect(netReduction(fuel, 'IND', 'median', 0)).toBe(0.5);
    expect(netReduction({ ...fuel, electrified: undefined }, 'IND', 'median', 0.4)).toBe(0.5);
  });
  it('farmEnergy adds back less of the grid’s CO₂ as the grid gets cleaner', () => {
    const path = gridPath(
      100,
      [1, 0.5, 0],
      [2026, 2050, 2100],
      () => 1,
      () => 1,
    );
    expect(path.map((v) => v.co2)).toEqual([0, -50, -100]);
    expect(
      gridPath(
        100,
        [0.5],
        [2026],
        () => 2,
        () => 0.5,
      )[0]?.co2,
    ).toBeCloseTo(-50);
  });
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
  it('ignore the nitrification inhibitors of an old URL, now part of nitrogen efficiency', () => {
    expect(decodeState('ne=50&ni=100').scenario.levers).toEqual({ nitrogenEfficiency: 0.5 });
  });
});
