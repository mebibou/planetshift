import { describe, expect, it } from 'vitest';
import { tooltipModel } from '../../src/map/tooltip';
import { sourceLink, worstSource } from '../../src/map/sources';
import { translator } from '../../src/i18n/i18n';
import type { Intensities } from '../../src/data/types';
import { countryResult } from './fakes';

const t = translator('en');
const spec = { layer: 'emissions', changeOf: 'emissions', group: 'all', gas: 'ch4' } as const;

const intensities: Intensities = {
  byCountry: {
    FRA: {
      '1': {
        farmGate: {
          kgPerTonne: { co2: 1, ch4: 1, n2o: 1 },
          tier: 1,
          source: 'https://hestia.earth/x',
        },
      },
      '2': {
        farmGate: {
          kgPerTonne: { co2: 1, ch4: 1, n2o: 1 },
          tier: 3,
          source: 'https://www.fao.org/faostat/en/#data/GCE',
        },
        cradleToFarmGate: {
          kgPerTonne: { co2: 1, ch4: 1, n2o: 1 },
          tier: 5,
          source: 'proxy:2511',
        },
      },
    },
  },
};

describe('tooltip', () => {
  it('shows before, after, change and the tier with its source', () => {
    const m = tooltipModel('France', countryResult(), spec, t, 'en-GB', {
      tier: 3,
      source: 'https://www.fao.org/faostat/',
    });
    expect(m.title).toBe('France');
    expect(m.rows).toEqual([
      ['Emissions of CH₄', ''],
      ['Today', '100 kg'],
      ['With the levers', '50 kg'],
      ['Change', '−50%'],
      ['Least precise source', 'FAOSTAT, this country'],
    ]);
    expect(m.source).toEqual({ label: 'FAOSTAT', url: 'https://www.fao.org/faostat/' });
  });

  it('shows the share of land farmed with its hectares, without an emission source', () => {
    const m = tooltipModel(
      'France',
      countryResult({
        land: { cropland: 18e6, pasture: 9.5e6 },
        landChange: { cropland: 0.5e6, pasture: -4.5e6 },
        landArea: 55e6,
      }),
      { ...spec, layer: 'land' },
      t,
      'en-GB',
      { tier: 3, source: 'https://www.fao.org/faostat/' },
    );
    expect(m.rows.map(([k, v]) => [k, v.replace(/\u00a0/g, ' ')])).toEqual([
      ['Share of the land farmed', ''],
      ['Today', '50%'],
      ['With the levers', '43%'],
      ['Change', '−14.5%'],
      ['Farmland', '27.5 Mha → 23.5 Mha'],
      ['Cropland', '18 Mha → 18.5 Mha'],
      ['Pasture', '9.5 Mha → 5 Mha'],
    ]);
    expect(m.source).toBeUndefined();
  });

  it('shows the forest cleared a year and its CO₂, without an emission source', () => {
    const m = tooltipModel(
      'Brazil',
      countryResult({
        deforestationCo2: 4.4e11,
        deforestationChange: -1.1e11,
        deforestationHa: 1.5e6,
        deforestationHaChange: -3e5,
      }),
      { ...spec, layer: 'deforestation' },
      t,
      'en-GB',
      { tier: 3, source: 'https://www.fao.org/faostat/' },
    );
    expect(m.rows.map(([k, v]) => [k, v.replace(/\u00a0/g, ' ')])).toEqual([
      ['Forest cleared for farming, a year', ''],
      ['Today', '1.5 Mha'],
      ['With the levers', '1.2 Mha'],
      ['Change', '−20%'],
      ['CO₂ from the clearing, a year', '440 Mt → 330 Mt'],
    ]);
    expect(m.source).toBeUndefined();
  });

  it('says when a country has no data', () => {
    expect(tooltipModel('Chad', undefined, spec, t, 'en-GB').rows[0]?.[0]).toBe(
      'No data for this country',
    );
  });

  it('finds the worst tier under a scope', () => {
    expect(worstSource(intensities, 'FRA', 'farmGate')?.tier).toBe(3);
    expect(worstSource(intensities, 'FRA', 'cradleToFarmGate')).toEqual({
      tier: 5,
      source: 'proxy:2511',
    });
    expect(worstSource(intensities, 'USA', 'farmGate')).toBeNull();
  });

  it('names sources and links only web addresses', () => {
    expect(sourceLink('https://hestia.earth/aggregation/abc').label).toBe('HESTIA');
    expect(sourceLink('https://example.org/a').label).toBe('example.org');
    expect(sourceLink('proxy:2511')).toEqual({ label: 'proxy:2511', url: null });
    expect(sourceLink('not a url')).toEqual({ label: 'not a url', url: null });
  });
});
