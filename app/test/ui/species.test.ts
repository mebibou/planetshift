import { describe, expect, it } from 'vitest';
import { fishStat, speciesStat } from '../../src/app/summary';
import { translator } from '../../src/i18n/i18n';
import { buildQuery, parseUi, DEFAULT_UI } from '../../src/app/url';
import {
  beforeAfter,
  layerValue,
  measureOf,
  speciesDensity,
  type LayerSpec,
} from '../../src/map/layers';
import { tableRows } from '../../src/map/table';
import { tooltipModel } from '../../src/map/tooltip';
import { countryResult } from './fakes';

const t = translator('en');
const plain = (s: string | undefined) => s?.replace(/\u00a0/g, ' ');
const spec: LayerSpec = { layer: 'species', changeOf: 'emissions', group: 'all', gas: 'co2e' };
const total = { before: 54000, after: 41000, described: 421093 };

describe('the species figure', () => {
  it('gives the species committed today and with the levers, and their share', () => {
    const s = speciesStat(t, 'en-GB', total, true);
    expect(s.label).toBe('Species committed to extinction by farmland');
    expect(s.value).toBe('54,000 → 41,000');
    expect(plain(s.detail)).toBe(
      '12.8% → 9.7% of the 421,093 described species of plants, mammals, birds, reptiles and amphibians, once freed farmland has grown back (Scherer et al. 2023)',
    );
    expect(plain(speciesStat(t, 'en-GB', total, false).detail)).toContain('gives none back');
  });

  it('gives the fish left as a share of an unfished ocean, and the change in catch', () => {
    const f = { unfished: 3.3e9, before: 1.1e9, after: 2.2e9, catchChange: -0.5 };
    const s = fishStat(t, 'en-GB', f);
    expect(s.value).toBe('33% → 67%');
    expect(plain(s.detail)).toBe(
      '1.1 Gt → 2.2 Gt of the 3.3 Gt there would be without fishing, as the catch changes by −50% (Bianchi et al. 2021)',
    );
  });
});

describe('the species layer', () => {
  it('maps the species committed with the levers, regrowth giving some back', () => {
    const c = countryResult({ species: 30, speciesChange: 2, speciesRegained: 12 });
    expect(measureOf(spec)).toBe('species');
    expect(beforeAfter(c, spec)).toEqual({ kind: 'species', before: 30, after: 20 });
    expect(layerValue(c, spec)).toBe(20);
    expect(layerValue(countryResult({ species: 0, speciesChange: 0 }), spec)).toBeNull();
  });

  it('lists only the countries with factors, and gives their farmland in the tooltip', () => {
    const rows = tableRows(
      [countryResult(), countryResult({ iso3: 'USA', species: 0 })],
      spec,
      (iso3) => ({ name: iso3, names: [iso3] }),
      () => null,
    );
    expect(rows.map((r) => [r.iso3, r.before, r.after])).toEqual([['FRA', 30, 32]]);
    const m = tooltipModel('France', countryResult(), spec, t, 'en-GB');
    expect(m.rows.map(([k, v]) => [k, plain(v)])).toEqual([
      ['Species committed to extinction', ''],
      ['Today', '30 species'],
      ['With the levers', '32 species'],
      ['Change', '+6.7%'],
      ['Farmland', '1 kha → 800 ha'],
    ]);
  });

  it('gives the species per Mha of farmland, the switch kept in the URL', () => {
    const per: LayerSpec = { ...spec, speciesPer: 'farmland' };
    const c = countryResult({ species: 30, speciesChange: 2 });
    expect(measureOf(per)).toBe('speciesDensity');
    expect(speciesDensity(c)).toEqual([30000, (32 / 800) * 1e6 - 30000]);
    expect(layerValue(c, per)).toBe(40000);
    expect(speciesDensity(countryResult({ land: { cropland: 0, pasture: 0 } }))).toEqual([0, 0]);
    const m = tooltipModel('France', c, per, t, 'en-GB');
    expect(m.rows.map(([k, v]) => [k, plain(v)]).slice(0, 3)).toEqual([
      ['Species committed per Mha of farmland', ''],
      ['Today', '30,000 species/Mha'],
      ['With the levers', '40,000 species/Mha'],
    ]);
    expect(m.rows[4]?.map(plain)).toEqual([
      'Species committed to extinction',
      '30 species → 32 species',
    ]);
    expect(parseUi('?per=farmland').speciesPer).toBe('farmland');
    expect(buildQuery('', { ...DEFAULT_UI, speciesPer: 'farmland' }, '')).toContain('per=farmland');
  });
});
