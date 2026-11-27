import { describe, expect, it } from 'vitest';
import { fileLicences, unitOf } from '../../src/app/download';
import { pollinationStat } from '../../src/app/summary';
import { translator } from '../../src/i18n/i18n';
import { beforeAfter, layerValue, type LayerSpec } from '../../src/map/layers';
import { tableRows } from '../../src/map/table';
import { tooltipModel } from '../../src/map/tooltip';
import type { PollinationTotals } from '../../src/model/api';
import { countryResult } from './fakes';

const t = translator('en');
const fr = translator('fr');
const plain = (s: string | undefined) => s?.replace(/[\u00a0\u202f]/g, ' ');
const spec: LayerSpec = { layer: 'pollination', changeOf: 'emissions', group: 'all', gas: 'co2e' };
const names = (iso3: string) => ({ name: iso3, names: [iso3] });

const totals = (over: Partial<PollinationTotals> = {}): PollinationTotals => ({
  tonnes: 1000,
  dependentTonnes: 200,
  attributableTonnes: 50,
  kcal: 2e9,
  dependentKcal: 6e8,
  attributableKcal: 1e8,
  ...over,
});
const rated = countryResult({
  pollination: totals(),
  pollinationChange: totals({
    tonnes: 0,
    dependentTonnes: 100,
    attributableTonnes: 20,
    kcal: 0,
    dependentKcal: 0,
    attributableKcal: 0,
  }),
});

describe('the pollinators layer', () => {
  it('measures the share of crop production from pollinator-dependent crops', () => {
    expect(beforeAfter(rated, spec)).toEqual({ kind: 'pollination', before: 0.2, after: 0.3 });
    expect(layerValue(rated, spec)).toBeCloseTo(0.3, 12);
  });

  it('leaves out of the map, the table and the tooltip the countries without rated crops', () => {
    const bare = countryResult({ iso3: 'NGA' });
    expect(layerValue(bare, spec)).toBeNull();
    expect(tableRows([rated, bare], spec, names, () => null).map((r) => r.iso3)).toEqual(['FRA']);
    expect(tooltipModel('Nigeria', bare, spec, t, 'en').rows).toEqual([
      ['No data for this country', ''],
    ]);
  });

  it('gives the other three shares in the tooltip, today and with the levers', () => {
    const m = tooltipModel('France', rated, spec, t, 'en');
    expect(m.rows.map(([k, v]) => [k, plain(v)])).toEqual([
      ['From pollinator-dependent crops, by weight', ''],
      ['Today', '20%'],
      ['With the levers', '30%'],
      ['Change', '+50%'],
      ['Due to pollination, by weight', '5% → 7%'],
      ['From pollinator-dependent crops, by calories', '30% → 30%'],
      ['Due to pollination, by calories', '5% → 5%'],
    ]);
    expect(m.source?.url).toBe('https://doi.org/10.1111/gcb.14736');
  });

  it('names its unit in the CSV, under CC BY 4.0', () => {
    expect(unitOf('pollination', spec)).toContain('share of crop production');
    expect(fileLicences('pollination.json').map((l) => l.name)).toEqual(['CC BY 4.0']);
  });
});

describe('the pollinators figure', () => {
  const shares = {
    before: {
      dependentTonnes: 0.231,
      attributableTonnes: 0.074,
      dependentKcal: 0.26,
      attributableKcal: 0.057,
    },
    after: {
      dependentTonnes: 0.234,
      attributableTonnes: 0.074,
      dependentKcal: 0.26,
      attributableKcal: 0.056,
    },
  };

  it('gives the dependent share today and with the levers, and the rest in its detail', () => {
    const s = pollinationStat(t, 'en-GB', shares);
    expect(s.label).toBe('Crop production from pollinator-dependent crops');
    expect(plain(s.value)).toBe('23.1% → 23.4%');
    expect(plain(s.detail)).toContain('Pollination itself accounts for 7.4% → 7.4%');
    expect(plain(s.detail)).toContain('not a loss');
  });

  it('is written in French too', () => {
    const s = pollinationStat(fr, 'fr', shares);
    expect(s.label).toBe('Production végétale issue de cultures dépendant des pollinisateurs');
    expect(plain(s.value)).toBe('23,1 % → 23,4 %');
  });
});
