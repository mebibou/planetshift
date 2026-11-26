import { describe, expect, it } from 'vitest';
import { unitOf } from '../../src/app/download';
import { translator } from '../../src/i18n/i18n';
import { beforeAfter, layerValue, measureOf, type LayerSpec } from '../../src/map/layers';
import { tableRows } from '../../src/map/table';
import { tooltipModel } from '../../src/map/tooltip';
import { countryResult } from './fakes';

const t = translator('en');
const plain = (s: string | undefined) => s?.replace(/\u00a0/g, ' ');
const spec: LayerSpec = {
  layer: 'fossilMethane',
  changeOf: 'emissions',
  group: 'all',
  gas: 'co2e',
};
const names = (iso3: string) => ({ name: iso3, names: [iso3] });
const leaking = countryResult({
  iso3: 'USA',
  fossilMethane: { oilGas: 13e9, coal: 1e9 },
  fossilMethaneChange: -10e9,
});

describe('the methane leaks layer', () => {
  it('measures the leaks of oil, gas and coal, and the change the levers make', () => {
    expect(measureOf(spec)).toBe('fossilMethane');
    expect(beforeAfter(leaking, spec)).toEqual({ kind: 'fossilMethane', before: 14e9, after: 4e9 });
    expect(layerValue(leaking, spec)).toBe(4e9);
  });

  it('leaves out of the map and the table the countries without leaks', () => {
    expect(layerValue(countryResult(), spec)).toBeNull();
    const rows = tableRows([leaking, countryResult()], spec, names, () => null);
    expect(rows.map((r) => r.iso3)).toEqual(['USA']);
  });

  it('gives each part in the tooltip, and no data where there is none', () => {
    const m = tooltipModel('United States', leaking, spec, t, 'en');
    expect(m.rows.map(([k, v]) => [k, plain(v)])).toEqual([
      ['Methane leaked by oil, gas and coal, a year', ''],
      ['Today', '14 Mt'],
      ['With the levers', '4 Mt'],
      ['Change', '−71.4%'],
      ['Of which oil and gas, today', '13 Mt'],
      ['Of which coal mines, today', '1 Mt'],
    ]);
    expect(tooltipModel('France', countryResult(), spec, t, 'en').rows).toEqual([
      ['No data for this country', ''],
    ]);
    expect(unitOf('fossilMethane', spec)).toContain('kg CH4');
  });
});
