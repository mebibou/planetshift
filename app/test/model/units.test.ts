import { describe, expect, it } from 'vitest';
import type { Feed, SupplyRow } from '../../src/data/types';
import {
  countryIntensities,
  emissionsOf,
  intensityOf,
  worstIntensity,
} from '../../src/model/emissions';
import { feedChange, feedSharesOf } from '../../src/model/feed';
import { clipChange, locate } from '../../src/model/location';
import { prepare, valueOf, vectorFrom } from '../../src/model/prepare';
import { MAX_SUPPLY_MULTIPLIER, supplyMultiplier } from '../../src/model/supplyChain';
import { valueAt, type ItemVector } from '../../src/model/util';
import { loadFixtures } from './fixtures';

const data = loadFixtures();
const prepared = prepare(data);
const country = (iso3: string) => prepared.countries.find((c) => c.country.iso3 === iso3)!;
const v = (...xs: number[]) => Float64Array.from(xs);
const row = (r: Partial<SupplyRow>): SupplyRow => ({
  production: 0,
  imports: 0,
  exports: 0,
  food: 0,
  feed: 0,
  losses: 0,
  processing: 0,
  seed: 0,
  other: 0,
  ...r,
});

describe('supply chain', () => {
  it('scales end use by losses and seed', () => {
    expect(supplyMultiplier(row({ food: 80, losses: 10, seed: 10 }))).toBeCloseTo(1.25, 12);
    expect(supplyMultiplier(row({}))).toBe(1);
    expect(supplyMultiplier(row({ losses: 5 }))).toBe(MAX_SUPPLY_MULTIPLIER);
  });
  it('does not scale processing', () => {
    expect(supplyMultiplier(row({ food: 1, processing: 99 }))).toBe(1);
    expect(supplyMultiplier(row({ food: 80, losses: 10, processing: 900 }))).toBeCloseTo(
      990 / 980,
      12,
    );
  });
});

describe('feed', () => {
  const fra = country('FRA');
  const all = (k: number) => ({
    ruminantMeat: k,
    pigMeat: k,
    poultryMeat: k,
    dairy: k,
    eggs: k,
    seafood: k,
  });
  const feedOf = (code: string) => fra.rows.get(code)!.feed;
  it('falls in proportion to animal production', () => {
    const change = feedChange(fra, all(-0.3), prepared, 'species');
    ['2511', '2514', '2516', '2555'].forEach((code) =>
      expect(valueOf(prepared, change, code)).toBeCloseTo(-0.3 * feedOf(code), 6),
    );
  });
  it('weights each group by its share, the region before the world', () => {
    const change = feedChange(fra, { ...all(0), poultryMeat: -1 }, prepared, 'species');
    expect(valueOf(prepared, change, '2514')).toBeCloseTo(-0.24 * feedOf('2514'), 6);
    expect(valueOf(prepared, change, '2555')).toBeCloseTo(-0.432 * feedOf('2555'), 6);
  });
  it('falls back to the world shares for a region without its own', () => {
    expect(feedSharesOf(data.feed, 'species', 'Africa', '2514')).toEqual(
      data.feed.shares.species['World']!['2514'],
    );
    expect(feedSharesOf(data.feed, 'species', 'Europe', '2514')).toEqual(
      data.feed.shares.species['Europe']!['2514'],
    );
    const none = { shares: { species: {}, gleam: {} } } as Feed;
    expect(feedSharesOf(none, 'gleam', 'Europe', '2514')).toBeUndefined();
  });
});

describe('location', () => {
  const demand = { A: v(-10, 5, 3), B: v(-20, 0, 0), C: v(0, 1, 0) };
  const production = { A: v(100, 0, 0), B: v(300, 0, 0), C: v(0, 50, 0) };
  const world = v(400, 50, 0);
  const total = (r: Record<string, ItemVector>, i: number) =>
    Object.values(r).reduce((a, x) => a + (x[i] as number), 0);
  it('conserves the world change with fixed trade shares', () => {
    const r = locate(demand, production, world, 'fixedTrade');
    expect(total(r, 0)).toBeCloseTo(-30, 12);
    expect(total(r, 1)).toBeCloseTo(9 - 3, 12);
    expect(r['A']![0]).toBeCloseTo(-7.5, 12);
    expect(r['C']![1]).toBeCloseTo(6, 12);
  });
  it('keeps demand for an item nobody produces where it is', () => {
    const r = locate(demand, production, world, 'fixedTrade');
    expect(r['A']![2]).toBe(3);
    expect(total(r, 2)).toBe(3);
  });
  it('conserves the world change with domestic production', () => {
    const r = locate(demand, production, world, 'domestic');
    expect(r).toEqual(demand);
  });
  it('trades the part of a domestic cut a country cannot make itself', () => {
    const r = locate({ A: v(-150), B: v(-20) }, { A: v(100), B: v(300) }, v(400), 'domestic');
    expect(r['A']![0]).toBeCloseTo(-100, 12);
    expect(r['B']![0]).toBeCloseTo(-70, 12);
    expect(total(r, 0)).toBeCloseTo(-170, 12);
  });
  it('clips at zero and says so', () => {
    expect(clipChange(v(10, 0), v(-15, 2))).toEqual({ change: v(-10, 2), clipped: true });
    expect(clipChange(v(10), v(-10)).clipped).toBe(false);
  });
});

describe('emissions', () => {
  const fra = country('FRA');
  const intensities = countryIntensities(fra, prepared, 'farmGate');
  it('multiplies tonnes by the intensity of the chosen scope', () => {
    const i = intensityOf(data.intensities, 'FRA', '2731', 'farmGate')!;
    expect(emissionsOf(vectorFrom(prepared, { 2731: 2 }), intensities).ch4).toBeCloseTo(
      2 * i.kgPerTonne.ch4,
      9,
    );
  });
  it('falls back to the other scope', () => {
    expect(intensityOf(data.intensities, 'NGA', '2615', 'cradleToFarmGate')).toEqual(
      data.intensities.byCountry['NGA']!['2615']!.farmGate,
    );
  });
  it('reports the worst tier and its source', () => {
    const nga = countryIntensities(country('NGA'), prepared, 'farmGate');
    const banana = data.intensities.byCountry['NGA']!['2615']!.farmGate!;
    expect(worstIntensity(vectorFrom(prepared, { 2731: 1 }), intensities).tier).toBe(1);
    expect(worstIntensity(vectorFrom(prepared, { 2731: 1, 2615: 1 }), nga)).toEqual({
      tier: banana.tier,
      source: banana.source,
    });
    expect(worstIntensity(vectorFrom(prepared, {}), intensities)).toEqual({ tier: 1, source: '' });
  });
  it('gives tier 6 and no source to an item without an intensity', () => {
    const fraOats = countryIntensities(fra, prepared, 'farmGate');
    const i = prepared.indexOf.get('2536')!;
    expect(fraOats.tiers[i]).toBe(6);
    expect(fraOats.sources[i]).toBe('');
  });
});

describe('valueAt', () => {
  it('interpolates and holds the ends', () => {
    expect(valueAt([2000, 2010], [0, 10], 2004)).toBeCloseTo(4, 12);
    expect(valueAt([2000, 2010], [0, 10], 1990)).toBe(0);
    expect(valueAt([2000, 2010], [0, 10], 2020)).toBe(10);
    expect(valueAt([], [], 2020)).toBeNaN();
  });
});
