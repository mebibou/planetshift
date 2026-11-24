import { describe, expect, it } from 'vitest';
import {
  colourScale,
  CHANGE_THRESHOLDS,
  NET_THRESHOLDS,
  logThresholds,
  niceCeil,
  pickColours,
  QUALITY_THRESHOLDS,
  roundSignificant,
  thresholdsFor,
} from '../../src/map/scales';
import { legendBins } from '../../src/map/legend';
import { LAYER_COLOURS, scaleKind } from '../../src/map/colours';

describe('scales', () => {
  it('rounds to significant digits', () => {
    expect(roundSignificant(1234, 1)).toBe(1000);
    expect(roundSignificant(0.0456, 2)).toBeCloseTo(0.046);
    expect(roundSignificant(0)).toBe(0);
  });

  it('rounds up to 1-2-5 numbers', () => {
    expect(niceCeil(0.03)).toBeCloseTo(0.05);
    expect(niceCeil(1)).toBe(1);
    expect(niceCeil(1.2)).toBe(2);
    expect(niceCeil(6)).toBe(10);
  });

  it('spaces log thresholds increasing between min and max', () => {
    const t = logThresholds(1, 1e6, 7);
    expect(t.length).toBe(6);
    t.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(t[i] ?? 0));
    expect(t[0]).toBeGreaterThan(1);
    expect(t.at(-1)).toBeLessThan(1e6);
    expect(logThresholds(0, 10, 7)).toEqual([]);
  });

  it('keeps change thresholds fixed and symmetric with a neutral middle', () => {
    const t = CHANGE_THRESHOLDS;
    const mid = t.length / 2;
    expect(t[0]).toBeCloseTo(-(t.at(-1) ?? 0));
    expect(t[mid - 1]).toBeLessThan(0);
    expect(t[mid]).toBeGreaterThan(0);
  });

  it('chooses thresholds per kind', () => {
    expect(thresholdsFor('quality', [1, 6], 7)).toEqual(QUALITY_THRESHOLDS);
    expect(thresholdsFor('sequential', [], 7)).toEqual([]);
    expect(thresholdsFor('diverging', [-0.2, 0.1], 7)).toEqual(CHANGE_THRESHOLDS);
    expect(thresholdsFor('diverging', [-0.9], 7)).toEqual(CHANGE_THRESHOLDS);
    expect(thresholdsFor('net', [-3e11, 1e12], 7)).toEqual(NET_THRESHOLDS);
  });

  it('maps values to colours by threshold', () => {
    const s = colourScale([10, 20], ['a', 'b', 'c']);
    expect([s(5), s(10), s(25)]).toEqual(['a', 'b', 'c']);
  });

  it('gives six data-quality colours, one per tier', () => {
    const s = colourScale(QUALITY_THRESHOLDS, LAYER_COLOURS.quality);
    expect([1, 2, 3, 4, 5, 6].map((t) => s(t))).toEqual(LAYER_COLOURS.quality);
    expect(scaleKind('quality')).toBe('quality');
    expect(scaleKind('change')).toBe('diverging');
    expect(scaleKind('landCo2')).toBe('net');
  });

  it('spreads colours over fewer bins, keeping both ends', () => {
    expect(pickColours(['1', '2', '3', '4', '5'], 3)).toEqual(['1', '3', '5']);
    expect(pickColours(['1', '2'], 5)).toEqual(['1', '2']);
  });

  it('labels legend bins', () => {
    expect(legendBins([10, 20], ['a', 'b', 'c'], String).map((b) => b.label)).toEqual([
      '< 10',
      '10 – 20',
      '≥ 20',
    ]);
    expect(legendBins([], ['a', 'b'], String)).toEqual([{ colour: 'a', label: '' }]);
  });
});
