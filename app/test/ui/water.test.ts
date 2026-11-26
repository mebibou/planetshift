import { describe, expect, it } from 'vitest';
import { unitOf } from '../../src/app/download';
import { waterStat } from '../../src/app/summary';
import { formatVolume } from '../../src/i18n/format';
import { translator } from '../../src/i18n/i18n';
import { beforeAfter, layerValue, measureOf, type LayerSpec } from '../../src/map/layers';
import { tableRows } from '../../src/map/table';
import { tooltipModel } from '../../src/map/tooltip';
import { countryResult } from './fakes';

const t = translator('en');
const plain = (s: string | undefined) => s?.replace(/\u00a0/g, ' ');
const spec = (layer: 'water' | 'waterScarcity'): LayerSpec => ({
  layer,
  changeOf: 'emissions',
  group: 'all',
  gas: 'co2e',
});
const names = (iso3: string) => ({ name: iso3, names: [iso3] });

describe('the freshwater layers', () => {
  it('measures litres withdrawn, and scarcity-weighted use apart from them', () => {
    const c = countryResult();
    expect(measureOf(spec('water'))).toBe('water');
    expect(beforeAfter(c, spec('water'))).toEqual({ kind: 'water', before: 4e11, after: 3e11 });
    expect(beforeAfter(c, spec('waterScarcity'))).toEqual({
      kind: 'waterScarcity',
      before: 9e12,
      after: 7e12,
    });
  });

  it('leaves out of the map and the table the countries without water', () => {
    const dry = countryResult({ iso3: 'NGA', water: 0, waterChange: 0, waterScarcity: 0 });
    expect(layerValue(dry, spec('water'))).toBeNull();
    expect(layerValue(countryResult(), spec('water'))).toBe(3e11);
    const rows = tableRows([countryResult(), dry], spec('waterScarcity'), names, () => null);
    expect(rows.map((r) => r.iso3)).toEqual(['FRA']);
    expect(rows[0]?.tier).toBeNull();
  });

  it('gives the litres and the land equipped for irrigation in the tooltip', () => {
    const m = tooltipModel('France', countryResult({ irrigatedHa: 2.9e6 }), spec('water'), t, 'en');
    expect(m.rows.map(([k, v]) => [k, plain(v)])).toEqual([
      ['Freshwater withdrawn, a year', ''],
      ['Today', '0.4 billion m³'],
      ['With the levers', '0.3 billion m³'],
      ['Change', '−25%'],
      ['Land equipped for irrigation', '2.9 Mha'],
    ]);
  });

  it('labels the scarcity-weighted use as L eq of the crops HESTIA covers', () => {
    const m = tooltipModel('France', countryResult(), spec('waterScarcity'), t, 'en');
    expect(plain(m.rows[1]?.[1])).toBe('9 billion m³ eq');
    expect(m.rows.at(-1)?.[0]).toBe('Crops HESTIA covers only');
    expect(unitOf('waterScarcity', spec('waterScarcity'))).toContain('L eq');
    expect(unitOf('water', spec('water'))).toBe('L of freshwater withdrawn');
  });

  it('formats volumes in billion m³, small ones in E notation, in both languages', () => {
    expect(plain(formatVolume('en', 2.7e15))).toBe('2,700 billion m³');
    expect(plain(formatVolume('en', 3.4e11))).toBe('0.34 billion m³');
    expect(plain(formatVolume('fr', 3.4e11))).toBe('0,34 milliards de m³');
    expect(plain(formatVolume('en', 3.2e8))).toBe('3.2E-4 billion m³');
    expect(plain(formatVolume('en', 0))).toBe('0 billion m³');
  });
});

describe('the freshwater figure', () => {
  it('gives the world’s withdrawals today and with the levers, and the change', () => {
    const s = waterStat(t, 'en-GB', { before: 2.6e15, after: 2.34e15 });
    expect(s.label).toBe('Freshwater withdrawn for farming');
    expect(plain(s.value)).toBe('2,600 → 2,340 billion m³');
    expect(plain(s.detail)).toContain('−10%');
  });
});
