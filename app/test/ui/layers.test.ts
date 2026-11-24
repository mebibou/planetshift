import { describe, expect, it } from 'vitest';
import {
  beforeAfter,
  co2e,
  gasValue,
  groupValue,
  layerValue,
  layerValues,
  landCo2Change,
  landUseCo2,
  mammalDensity,
  measureOf,
  relativeChange,
  type LayerSpec,
} from '../../src/map/layers';
import { countryResult } from './fakes';

const spec = (over: Partial<LayerSpec>): LayerSpec => ({
  layer: 'production',
  changeOf: 'production',
  group: 'all',
  gas: 'co2e',
  ...over,
});

describe('layers', () => {
  it('weighs gases by GWP100 for CO₂e only', () => {
    expect(co2e({ co2: 1, ch4: 1, n2o: 1 })).toBeCloseTo(1 + 27 + 273);
    expect(gasValue({ co2: 1, ch4: 2, n2o: 3 }, 'ch4')).toBe(2);
  });

  it('sums all groups or picks one', () => {
    expect(groupValue({ cereals: 1, dairy: 2 }, 'all')).toBe(3);
    expect(groupValue({ cereals: 1 }, 'dairy')).toBe(0);
  });

  it('measures production before and after', () => {
    expect(beforeAfter(countryResult(), spec({}))).toEqual({
      kind: 'production',
      before: 110,
      after: 125,
    });
  });

  it('measures emissions of a gas before and after', () => {
    expect(beforeAfter(countryResult(), spec({ layer: 'emissions', gas: 'ch4' }))).toEqual({
      kind: 'emissions',
      before: 100,
      after: 50,
    });
  });

  it('measures land use as the share of the land farmed, before and after', () => {
    expect(beforeAfter(countryResult(), spec({ layer: 'land' }))).toEqual({
      kind: 'landShare',
      before: 0.2,
      after: 0.16,
    });
    expect(layerValue(countryResult(), spec({ layer: 'land' }))).toBeCloseTo(0.16);
    expect(layerValue(countryResult({ landArea: 0 }), spec({ layer: 'land' }))).toBeNull();
    expect(layerValue(countryResult(), spec({ layer: 'change', changeOf: 'land' }))).toBeCloseTo(
      -0.2,
    );
    expect(measureOf({ layer: 'change', changeOf: 'land' })).toBe('land');
    expect(measureOf({ layer: 'quality', changeOf: 'land' })).toBe('production');
  });

  it('gives the relative change, or null without a base', () => {
    expect(relativeChange({ kind: 'production', before: 100, after: 80 })).toBeCloseTo(-0.2);
    expect(relativeChange({ kind: 'production', before: 0, after: 5 })).toBeNull();
  });

  it('colours each layer by its value with the levers', () => {
    const c = countryResult();
    expect(layerValue(c, spec({ group: 'cereals' }))).toBe(120);
    expect(layerValue(c, spec({ group: 'dairy' }))).toBeNull();
    expect(layerValue(c, spec({ layer: 'change', changeOf: 'emissions', gas: 'ch4' }))).toBe(-0.5);
    expect(layerValue(c, spec({ layer: 'quality' }))).toBe(3);
  });

  it('maps each country to its value', () => {
    const values = layerValues(
      [countryResult({ iso3: 'A' }), countryResult({ iso3: 'B', worstTier: 6 })],
      spec({ layer: 'quality' }),
    );
    expect([...values]).toEqual([
      ['A', 3],
      ['B', 6],
    ]);
  });

  it('measures forest clearing in hectares, before and after', () => {
    const c = countryResult({ deforestationHa: 5e9, deforestationHaChange: -2e9 });
    expect(measureOf(spec({ layer: 'deforestation' }))).toBe('deforestation');
    expect(beforeAfter(c, spec({ layer: 'deforestation' }))).toEqual({
      kind: 'deforestation',
      before: 5e9,
      after: 3e9,
    });
    expect(layerValue(c, spec({ layer: 'deforestation' }))).toBe(3e9);
    expect(layerValue(countryResult(), spec({ layer: 'deforestation' }))).toBeNull();
  });

  it('gives net land-use CO₂ in kg, sinks below zero, less the clearing and regrowth the levers change', () => {
    const landUse = landUseCo2({
      byCountry: { FRA: -2e6, BRA: 1.4e9 },
      world: 5e9,
      years: [2015, 2024],
      source: '',
    });
    const c = countryResult({ deforestationCo2: 5e9, deforestationChange: -2e9 });
    expect(measureOf(spec({ layer: 'landCo2' }))).toBe('landCo2');
    expect(layerValue(c, spec({ layer: 'landCo2' }), landUse)).toBe(-4e9);
    expect(beforeAfter(c, spec({ layer: 'landCo2' }), landUse)).toEqual({
      kind: 'landCo2',
      before: -2e9,
      after: -4e9,
    });
    const regrowing = countryResult({ deforestationChange: -2e9, regrowthCo2: 1e9 });
    expect(landCo2Change(regrowing)).toBe(-3e9);
    expect(landCo2Change(countryResult())).toBe(0);
    expect(
      layerValue(countryResult({ iso3: 'USA' }), spec({ layer: 'landCo2' }), landUse),
    ).toBeNull();
    expect(landUseCo2(undefined).size).toBe(0);
  });

  it('gives farmed mammals in tonnes of live weight per km² of land, before and after', () => {
    const c = countryResult({ mammals: 8e6, mammalsChange: -6e6, landArea: 5.5e7 });
    expect(measureOf(spec({ layer: 'mammals' }))).toBe('mammals');
    expect(mammalDensity(c)[0]).toBeCloseTo(8e6 / 5.5e5);
    expect(beforeAfter(c, spec({ layer: 'mammals' }))).toEqual({
      kind: 'mammals',
      before: expect.closeTo(8e6 / 5.5e5),
      after: expect.closeTo(2e6 / 5.5e5),
    });
    expect(layerValue(c, spec({ layer: 'mammals' }))).toBeCloseTo(2e6 / 5.5e5);
  });

  it('has no farmed mammals value without herds or land area, but one when all are gone', () => {
    const none = spec({ layer: 'mammals' });
    expect(layerValue(countryResult({ mammals: 0, mammalsChange: 0 }), none)).toBeNull();
    expect(layerValue(countryResult({ landArea: 0 }), none)).toBeNull();
    expect(layerValue(countryResult({ mammals: 10, mammalsChange: -10 }), none)).toBe(0);
    expect(mammalDensity(countryResult({ landArea: 0 }))).toEqual([0, 0]);
  });
});
