import { describe, expect, it } from 'vitest';
import {
  beforeAfter,
  co2e,
  gasValue,
  groupValue,
  layerValue,
  layerValues,
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

  it('measures farmland, cropland and pasture together, before and after', () => {
    expect(beforeAfter(countryResult(), spec({ layer: 'land' }))).toEqual({
      kind: 'land',
      before: 1000,
      after: 800,
    });
    expect(layerValue(countryResult(), spec({ layer: 'land' }))).toBe(800);
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
});
